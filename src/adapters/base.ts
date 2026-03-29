export interface PlatformAdapter {
  name: string;
  matchUrl(url: string): boolean;
  getInputElement(): HTMLElement | null;
  setText(element: HTMLElement, text: string): void;
  submit(element: HTMLElement): void;
  getTheme(): "light" | "dark";
}

/** Dispatch native InputEvent so frameworks (React/Svelte) pick up the change */
function dispatchInput(el: HTMLElement): void {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function detectAdapter(): PlatformAdapter | null {
  const url = window.location.href;
  for (const adapter of ALL_ADAPTERS) {
    if (adapter.matchUrl(url)) return adapter;
  }
  return null;
}

// re-exported after class definitions
let ALL_ADAPTERS: PlatformAdapter[] = [];

export class GrokAdapter implements PlatformAdapter {
  name = "Grok";

  matchUrl(url: string): boolean {
    return /^https:\/\/(x\.com\/i\/grok|grok\.com)/.test(url);
  }

  getInputElement(): HTMLElement | null {
    // grok.com uses a textarea or contenteditable
    return (
      document.querySelector<HTMLElement>('textarea[data-testid="grokInput"]') ??
      document.querySelector<HTMLElement>('div[contenteditable="true"]') ??
      document.querySelector<HTMLElement>("textarea")
    );
  }

  setText(el: HTMLElement, text: string): void {
    if (el instanceof HTMLTextAreaElement) {
      // Use native setter to bypass React's controlled input
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }
      dispatchInput(el);
    } else {
      // contenteditable
      el.textContent = text;
      dispatchInput(el);
    }
  }

  submit(el: HTMLElement): void {
    // Try clicking the send button first
    const sendBtn =
      document.querySelector<HTMLElement>('button[data-testid="sendButton"]') ??
      document.querySelector<HTMLElement>('button[aria-label="Send"]') ??
      document.querySelector<HTMLElement>('button[aria-label="送出"]');
    if (sendBtn) {
      sendBtn.click();
      return;
    }
    // Fallback: Enter key
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  }

  getTheme(): "light" | "dark" {
    return document.documentElement.classList.contains("dark") ||
      document.body.style.backgroundColor?.includes("rgb(0")
      ? "dark"
      : "light";
  }
}

export class GeminiAdapter implements PlatformAdapter {
  name = "Gemini";

  matchUrl(url: string): boolean {
    return url.startsWith("https://gemini.google.com");
  }

  getInputElement(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>(".ql-editor[contenteditable='true']") ??
      document.querySelector<HTMLElement>('div[contenteditable="true"]') ??
      document.querySelector<HTMLElement>("rich-textarea .ql-editor") ??
      document.querySelector<HTMLElement>(".input-area-container textarea")
    );
  }

  setText(el: HTMLElement, text: string): void {
    if (el instanceof HTMLTextAreaElement) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }
      dispatchInput(el);
    } else {
      // Quill/contenteditable — set via innerHTML to trigger Quill update
      el.innerHTML = `<p>${text.replace(/\n/g, "</p><p>")}</p>`;
      dispatchInput(el);
    }
  }

  submit(el: HTMLElement): void {
    const sendBtn =
      document.querySelector<HTMLElement>('button.send-button') ??
      document.querySelector<HTMLElement>('button[aria-label="Send message"]') ??
      document.querySelector<HTMLElement>('button[aria-label="傳送訊息"]') ??
      document.querySelector<HTMLElement>('button[mattooltip="Send message"]') ??
      document.querySelector<HTMLElement>('.send-button-container button');
    if (sendBtn) {
      sendBtn.click();
      return;
    }
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  }

  getTheme(): "light" | "dark" {
    return document.documentElement.getAttribute("dark") !== null ||
      document.body.classList.contains("dark-theme")
      ? "dark"
      : "light";
  }
}

ALL_ADAPTERS = [new GrokAdapter(), new GeminiAdapter()];
