/**
 * Grok platform adapter
 * Supports: x.com/i/grok, grok.com
 */

import { PlatformAdapter, dispatchInput } from "./base";

export class GrokAdapter implements PlatformAdapter {
  name = "Grok";

  matchUrl(url: string): boolean {
    return /^https:\/\/(x\.com\/i\/grok|grok\.com)/.test(url);
  }

  getInputElement(): HTMLElement | null {
    // grok.com uses a textarea or contenteditable
    return (
      document.querySelector<HTMLElement>(
        'textarea[data-testid="grokInput"]'
      ) ??
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
