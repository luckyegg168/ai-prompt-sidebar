/**
 * Tests for platform adapters
 */

import {
  GrokAdapter,
  GeminiAdapter,
  ChatGPTAdapter,
  ClaudeAdapter,
} from "../adapters";

describe("GrokAdapter", () => {
  let adapter: GrokAdapter;

  beforeEach(() => {
    adapter = new GrokAdapter();
  });

  describe("matchUrl", () => {
    it("should match x.com/i/grok URLs", () => {
      expect(adapter.matchUrl("https://x.com/i/grok")).toBe(true);
      expect(adapter.matchUrl("https://x.com/i/grok/something")).toBe(true);
    });

    it("should match grok.com URLs", () => {
      expect(adapter.matchUrl("https://grok.com")).toBe(true);
      expect(adapter.matchUrl("https://grok.com/chat")).toBe(true);
    });

    it("should not match other URLs", () => {
      expect(adapter.matchUrl("https://x.com")).toBe(false);
      expect(adapter.matchUrl("https://twitter.com")).toBe(false);
      expect(adapter.matchUrl("https://gemini.google.com")).toBe(false);
    });
  });

  describe("getTheme", () => {
    it("should return dark theme when document has dark class", () => {
      document.documentElement.classList.add("dark");
      expect(adapter.getTheme()).toBe("dark");
      document.documentElement.classList.remove("dark");
    });

    it("should return light theme by default", () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
      expect(adapter.getTheme()).toBe("light");
    });
  });
});

describe("GeminiAdapter", () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    adapter = new GeminiAdapter();
  });

  describe("matchUrl", () => {
    it("should match gemini.google.com URLs", () => {
      expect(adapter.matchUrl("https://gemini.google.com")).toBe(true);
      expect(adapter.matchUrl("https://gemini.google.com/app")).toBe(true);
    });

    it("should not match other URLs", () => {
      expect(adapter.matchUrl("https://google.com")).toBe(false);
      expect(adapter.matchUrl("https://chatgpt.com")).toBe(false);
    });
  });

  describe("getTheme", () => {
    it("should return dark theme when document has dark attribute", () => {
      document.documentElement.setAttribute("dark", "");
      expect(adapter.getTheme()).toBe("dark");
      document.documentElement.removeAttribute("dark");
    });

    it("should return light theme by default", () => {
      document.documentElement.removeAttribute("dark");
      document.body.classList.remove("dark-theme");
      expect(adapter.getTheme()).toBe("light");
    });
  });
});

describe("ChatGPTAdapter", () => {
  let adapter: ChatGPTAdapter;

  beforeEach(() => {
    adapter = new ChatGPTAdapter();
  });

  describe("matchUrl", () => {
    it("should match chatgpt.com URLs", () => {
      expect(adapter.matchUrl("https://chatgpt.com")).toBe(true);
      expect(adapter.matchUrl("https://chatgpt.com/")).toBe(true);
    });

    it("should not match other URLs", () => {
      expect(adapter.matchUrl("https://openai.com")).toBe(false);
      expect(adapter.matchUrl("https://claude.ai")).toBe(false);
    });
  });

  describe("getTheme", () => {
    it("should return dark theme when document has dark class", () => {
      document.documentElement.classList.add("dark");
      expect(adapter.getTheme()).toBe("dark");
      document.documentElement.classList.remove("dark");
    });

    it("should return light theme by default", () => {
      document.documentElement.classList.remove("dark");
      expect(adapter.getTheme()).toBe("light");
    });
  });
});

describe("ClaudeAdapter", () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
  });

  describe("matchUrl", () => {
    it("should match claude.ai URLs", () => {
      expect(adapter.matchUrl("https://claude.ai")).toBe(true);
      expect(adapter.matchUrl("https://claude.ai/chats")).toBe(true);
    });

    it("should not match other URLs", () => {
      expect(adapter.matchUrl("https://anthropic.com")).toBe(false);
      expect(adapter.matchUrl("https://chatgpt.com")).toBe(false);
    });
  });

  describe("getTheme", () => {
    it("should return dark theme when data-theme is dark", () => {
      document.documentElement.setAttribute("data-theme", "dark");
      expect(adapter.getTheme()).toBe("dark");
      document.documentElement.removeAttribute("data-theme");
    });

    it("should return light theme by default", () => {
      document.documentElement.removeAttribute("data-theme");
      expect(adapter.getTheme()).toBe("light");
    });
  });
});
