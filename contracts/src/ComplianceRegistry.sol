// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ComplianceRegistry
/// @notice On-chain identity allowlist (ERC-3643-style). Tracks KYC (individuals)
///         and KYB (businesses). A backend holding VERIFIER_ROLE writes results
///         after off-chain verification. PropertyShares consults this registry to
///         gate share ownership.
contract ComplianceRegistry is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    mapping(address => bool) public kycVerified;
    mapping(address => bool) public kybVerified;

    event KycSet(address indexed account, bool status);
    event KybSet(address indexed account, bool status);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /// @notice True if the account may hold property shares (KYC or KYB verified).
    function isVerified(address account) external view returns (bool) {
        return kycVerified[account] || kybVerified[account];
    }

    function setKyc(address account, bool status) external onlyRole(VERIFIER_ROLE) {
        kycVerified[account] = status;
        emit KycSet(account, status);
    }

    function setKyb(address account, bool status) external onlyRole(VERIFIER_ROLE) {
        kybVerified[account] = status;
        emit KybSet(account, status);
    }

    function setKycBatch(address[] calldata accounts, bool status) external onlyRole(VERIFIER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            kycVerified[accounts[i]] = status;
            emit KycSet(accounts[i], status);
        }
    }
}
