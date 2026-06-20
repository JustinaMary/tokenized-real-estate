// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IComplianceRegistry {
    function isVerified(address account) external view returns (bool);
}

/// @title PropertyShares
/// @notice Each property is an ERC-1155 token id with a fixed share supply.
///         Rental income is distributed to holders via a pull-based dividend
///         accumulator. Rent is checkpointed on every transfer so trading and
///         rent accrual stay correct.
contract PropertyShares is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Fixed-point scale for the rent-per-share accumulator.
    uint256 private constant ACC_PRECISION = 1e18;

    struct Property {
        uint256 supply; // total shares (immutable once created)
        uint256 pricePerShare; // primary-sale price in mUSDC
        address issuer; // receives primary-sale proceeds; holds unsold inventory
        string metadataURI; // ipfs:// JSON describing the property
        uint256 sharesSold; // shares sold via primary sale
    }

    IERC20 public immutable usdc;
    IComplianceRegistry public immutable registry;
    uint256 public nextId;

    mapping(uint256 => Property) public properties;

    /// @dev Cumulative rent per share for a property, scaled by ACC_PRECISION.
    mapping(uint256 => uint256) public accRentPerShare;
    /// @dev Rent already accounted for a user given their last balance change.
    mapping(uint256 => mapping(address => uint256)) public rewardDebt;
    /// @dev Rent harvested into a claimable balance but not yet withdrawn.
    mapping(uint256 => mapping(address => uint256)) public pendingRent;

    event PropertyCreated(uint256 indexed id, uint256 supply, uint256 pricePerShare, string metadataURI);
    event PrimaryPurchase(uint256 indexed id, address indexed buyer, uint256 amount, uint256 cost);
    event RentDeposited(uint256 indexed id, uint256 amount);
    event RentClaimed(uint256 indexed id, address indexed holder, uint256 amount);

    error InvalidSupply();
    error InvalidAmount();
    error ExceedsSupply();
    error UnknownProperty();
    error NotVerified();

    constructor(address usdc_, address registry_) ERC1155("") Ownable(msg.sender) {
        usdc = IERC20(usdc_);
        registry = IComplianceRegistry(registry_);
    }

    // --- Issuer actions ---

    /// @notice Create a new property and mint its full supply to the issuer as inventory.
    function createProperty(uint256 supply, uint256 pricePerShare, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 id)
    {
        if (supply == 0) revert InvalidSupply();
        id = nextId++;
        properties[id] = Property({
            supply: supply,
            pricePerShare: pricePerShare,
            issuer: msg.sender,
            metadataURI: metadataURI,
            sharesSold: 0
        });
        _mint(msg.sender, id, supply, "");
        emit PropertyCreated(id, supply, pricePerShare, metadataURI);
    }

    /// @notice Deposit rental income for a property; split across all shares.
    function depositRent(uint256 id, uint256 amount) external nonReentrant {
        Property storage p = properties[id];
        if (p.supply == 0) revert UnknownProperty();
        if (amount == 0) revert InvalidAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        accRentPerShare[id] += (amount * ACC_PRECISION) / p.supply;
        emit RentDeposited(id, amount);
    }

    // --- Investor actions ---

    /// @notice Buy shares from the issuer's primary inventory.
    function buyPrimary(uint256 id, uint256 amount) external nonReentrant {
        Property storage p = properties[id];
        if (p.supply == 0) revert UnknownProperty();
        if (amount == 0) revert InvalidAmount();
        if (p.sharesSold + amount > p.supply) revert ExceedsSupply();

        p.sharesSold += amount;
        uint256 cost = amount * p.pricePerShare;
        usdc.safeTransferFrom(msg.sender, p.issuer, cost);
        _safeTransferFrom(p.issuer, msg.sender, id, amount, "");
        emit PrimaryPurchase(id, msg.sender, amount, cost);
    }

    /// @notice Claim accrued rent for a property.
    function claimRent(uint256 id) external nonReentrant {
        _harvest(id, msg.sender);
        rewardDebt[id][msg.sender] = (balanceOf(msg.sender, id) * accRentPerShare[id]) / ACC_PRECISION;
        uint256 amount = pendingRent[id][msg.sender];
        if (amount > 0) {
            pendingRent[id][msg.sender] = 0;
            usdc.safeTransfer(msg.sender, amount);
            emit RentClaimed(id, msg.sender, amount);
        }
    }

    // --- Views ---

    /// @notice Rent a user can currently claim for a property.
    function claimable(uint256 id, address user) external view returns (uint256) {
        uint256 accumulated = (balanceOf(user, id) * accRentPerShare[id]) / ACC_PRECISION;
        return pendingRent[id][user] + accumulated - rewardDebt[id][user];
    }

    function uri(uint256 id) public view override returns (string memory) {
        return properties[id].metadataURI;
    }

    // --- Rent checkpointing ---

    /// @dev Move newly-accrued rent into the user's pending balance using their
    ///      current (pre-change) balance and reward debt.
    function _harvest(uint256 id, address user) internal {
        uint256 accumulated = (balanceOf(user, id) * accRentPerShare[id]) / ACC_PRECISION;
        pendingRent[id][user] += accumulated - rewardDebt[id][user];
    }

    /// @dev Checkpoint rent for both parties around every mint/transfer/burn so
    ///      pre-transfer rent stays with the seller and post-transfer rent goes
    ///      to the buyer.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        // Compliance gate: only KYC/KYB-verified addresses may receive shares.
        // Burns (to == 0) and the sender side are unaffected, so exits and rent
        // claims stay open.
        if (to != address(0) && !registry.isVerified(to)) revert NotVerified();

        uint256 len = ids.length;
        for (uint256 i = 0; i < len; i++) {
            if (from != address(0)) _harvest(ids[i], from);
            if (to != address(0)) _harvest(ids[i], to);
        }

        super._update(from, to, ids, values);

        for (uint256 i = 0; i < len; i++) {
            if (from != address(0)) {
                rewardDebt[ids[i]][from] = (balanceOf(from, ids[i]) * accRentPerShare[ids[i]]) / ACC_PRECISION;
            }
            if (to != address(0)) {
                rewardDebt[ids[i]][to] = (balanceOf(to, ids[i]) * accRentPerShare[ids[i]]) / ACC_PRECISION;
            }
        }
    }
}
