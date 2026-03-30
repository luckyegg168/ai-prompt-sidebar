/**
 * Toast notification utilities
 */

export interface ToastOptions {
  duration?: number;
  type?: "success" | "error" | "info";
  position?: "top-right" | "bottom-right" | "top-center" | "bottom-center";
}

const DEFAULT_TOAST_OPTIONS: Required<ToastOptions> = {
  duration: 3000,
  type: "success",
  position: "bottom-right",
};

const TOAST_ICONS: Record<string, string> = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
};

/**
 * Show a toast notification
 */
export function showToast(
  message: string,
  options: ToastOptions = {}
): () => void {
  const opts = { ...DEFAULT_TOAST_OPTIONS, ...options };

  const toast = document.createElement("div");
  toast.className = `aps-toast aps-toast-${opts.type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = `${TOAST_ICONS[opts.type]} ${message}`;

  // Position the toast
  switch (opts.position) {
    case "top-right":
      toast.style.top = "24px";
      toast.style.right = "24px";
      toast.style.bottom = "auto";
      break;
    case "top-center":
      toast.style.top = "24px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.bottom = "auto";
      break;
    case "bottom-center":
      toast.style.bottom = "24px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      break;
    case "bottom-right":
    default:
      toast.style.bottom = "24px";
      toast.style.right = "24px";
      break;
  }

  document.body.appendChild(toast);

  // Auto remove
  const timeoutId = setTimeout(() => {
    removeToast(toast);
  }, opts.duration);

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    removeToast(toast);
  };
}

/**
 * Remove a toast element
 */
function removeToast(toast: HTMLElement): void {
  toast.style.opacity = "0";
  toast.style.transform = toast.style.transform
    ? `${toast.style.transform} translateY(20px)`
    : "translateY(20px)";

  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Show success toast
 */
export function showSuccess(
  message: string,
  options?: ToastOptions
): () => void {
  return showToast(message, { ...options, type: "success" });
}

/**
 * Show error toast
 */
export function showError(message: string, options?: ToastOptions): () => void {
  return showToast(message, { ...options, type: "error" });
}

/**
 * Show info toast
 */
export function showInfo(message: string, options?: ToastOptions): () => void {
  return showToast(message, { ...options, type: "info" });
}
