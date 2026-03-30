/**
 * Event listener utilities
 */

/**
 * Create a debounced event handler
 */
export function createDebouncedHandler<T extends Event>(
  handler: (event: T) => void,
  delay: number = 300
): (event: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (event: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      handler(event);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a throttled event handler
 */
export function createThrottledHandler<T extends Event>(
  handler: (event: T) => void,
  limit: number = 100
): (event: T) => void {
  let isThrottled = false;

  return (event: T) => {
    if (isThrottled) return;

    handler(event);
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
    }, limit);
  };
}

/**
 * Add event listener with once option
 */
export function addOnceListener<T extends Event>(
  target: EventTarget,
  type: string,
  listener: (event: T) => void,
  options?: boolean | AddEventListenerOptions
): void {
  const opts: AddEventListenerOptions = {
    ...(typeof options === "object" ? options : {}),
    once: true,
  };
  target.addEventListener(type, listener as EventListener, opts);
}

/**
 * Create a disposable event listener
 */
export function createDisposableListener<T extends Event>(
  target: EventTarget,
  type: string,
  listener: (event: T) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  target.addEventListener(type, listener as EventListener, options);
  return () => {
    target.removeEventListener(type, listener as EventListener, options);
  };
}

/**
 * Listen for URL changes (SPA navigation)
 */
export function onUrlChange(
  callback: (newUrl: string, oldUrl: string) => void,
  checkInterval: number = 300
): () => void {
  let lastUrl = window.location.href;

  // Listen for popstate and hashchange
  const popstateHandler = () => {
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      callback(newUrl, lastUrl);
      lastUrl = newUrl;
    }
  };

  window.addEventListener("popstate", popstateHandler);
  window.addEventListener("hashchange", popstateHandler);

  // Fallback: MutationObserver for pushState navigation
  let urlCheckTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (urlCheckTimer) return;
    urlCheckTimer = setTimeout(() => {
      const newUrl = window.location.href;
      if (newUrl !== lastUrl) {
        callback(newUrl, lastUrl);
        lastUrl = newUrl;
      }
      urlCheckTimer = null;
    }, checkInterval);
  });

  observer.observe(document.body, { childList: true, subtree: false });

  // Return cleanup function
  return () => {
    window.removeEventListener("popstate", popstateHandler);
    window.removeEventListener("hashchange", popstateHandler);
    observer.disconnect();
    if (urlCheckTimer) clearTimeout(urlCheckTimer);
  };
}
