/**
 * DOM utility functions
 */

/**
 * Create an HTML element with optional class name
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

/**
 * Safely set text content to an element
 */
export function setTextContent(el: Element, text: string): void {
  el.textContent = text;
}

/**
 * Find element with type safety
 */
export function findElement<K extends keyof HTMLElementTagNameMap>(
  parent: ParentNode,
  selector: K
): HTMLElementTagNameMap[K] | null {
  return parent.querySelector(selector);
}

/**
 * Find element with type safety and fallback
 */
export function findElementOrThrow<K extends keyof HTMLElementTagNameMap>(
  parent: ParentNode,
  selector: K,
  errorMessage?: string
): HTMLElementTagNameMap[K] {
  const element = parent.querySelector(selector);
  if (!element) {
    throw new Error(errorMessage ?? `Element not found: ${selector}`);
  }
  return element as HTMLElementTagNameMap[K];
}

/**
 * Toggle element visibility
 */
export function toggleVisibility(el: HTMLElement, visible?: boolean): void {
  if (visible !== undefined) {
    el.style.display = visible ? "" : "none";
  } else {
    el.style.display = el.style.display === "none" ? "" : "none";
  }
}

/**
 * Add event listener with automatic cleanup
 */
export function createEventDelegate<
  T extends HTMLElement,
  E extends Event = Event,
>(
  target: T,
  eventType: string,
  handler: (this: T, event: E) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  target.addEventListener(eventType, handler as EventListener, options);
  return () => {
    target.removeEventListener(eventType, handler as EventListener, options);
  };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
