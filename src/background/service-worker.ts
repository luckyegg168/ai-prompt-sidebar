/**
 * Service worker — handles extension lifecycle and context menu.
 */

chrome.runtime.onInstalled.addListener(() => {
  // Remove all existing menus to avoid duplicate ID errors on update
  chrome.contextMenus?.removeAll(() => {
    chrome.contextMenus?.create({
      id: "aps-toggle",
      title: "切換 AI Prompt Sidebar",
      contexts: ["page"],
      documentUrlPatterns: [
        "https://x.com/i/grok*",
        "https://grok.com/*",
        "https://gemini.google.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
      ],
    });
  });
});

// Context menu click
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "aps-toggle" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
  }
});

// Keyboard shortcut (if defined in manifest commands)
chrome.commands?.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_SIDEBAR" });
      }
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] ?? null });
    });
    return true; // async
  }
});
