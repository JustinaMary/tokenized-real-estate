export type ToastType = "info" | "success" | "error";
export type ToastDetail = { id: number; type: ToastType; message: string };

let counter = 0;

/** Fire a toast from anywhere (client-side). Rendered by <Toaster/>. */
export function toast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  const detail: ToastDetail = { id: ++counter, type, message };
  window.dispatchEvent(new CustomEvent<ToastDetail>("terra:toast", { detail }));
}
