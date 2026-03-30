import {
  getSettings,
  saveSettings,
  saveTemplates,
  saveCategories,
} from "../storage/templates";
import { DEFAULT_SETTINGS } from "../models/template";

const themeSelect = document.getElementById(
  "theme-select"
) as HTMLSelectElement;
const autoShowCb = document.getElementById("auto-show") as HTMLInputElement;
const widthSlider = document.getElementById(
  "sidebar-width"
) as HTMLInputElement;
const widthValue = document.getElementById("width-value") as HTMLSpanElement;
const toggleBtn = document.getElementById("toggle-btn") as HTMLButtonElement;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

// Load current settings
(async () => {
  const settings = await getSettings();
  themeSelect.value = settings.theme;
  autoShowCb.checked = settings.autoShow;
  widthSlider.value = String(settings.sidebarWidth);
  widthValue.textContent = String(settings.sidebarWidth);
})();

// Theme change
themeSelect.addEventListener("change", async () => {
  const settings = await getSettings();
  const updated = {
    ...settings,
    theme: themeSelect.value as "auto" | "light" | "dark",
  };
  await saveSettings(updated);
  notifyContentScript("SETTINGS_CHANGED");
});

// Auto-show toggle
autoShowCb.addEventListener("change", async () => {
  const settings = await getSettings();
  const updated = { ...settings, autoShow: autoShowCb.checked };
  await saveSettings(updated);
});

// Width slider
widthSlider.addEventListener("input", () => {
  widthValue.textContent = widthSlider.value;
});
widthSlider.addEventListener("change", async () => {
  const settings = await getSettings();
  const updated = { ...settings, sidebarWidth: Number(widthSlider.value) };
  await saveSettings(updated);
  notifyContentScript("SETTINGS_CHANGED");
});

// Toggle sidebar in active tab
toggleBtn.addEventListener("click", () => {
  notifyContentScript("TOGGLE_SIDEBAR");
  window.close();
});

// Reset to defaults
resetBtn.addEventListener("click", async () => {
  if (!confirm("確定要重設所有模板為預設值？自訂模板將被刪除。")) return;
  await saveSettings(DEFAULT_SETTINGS);
  await saveTemplates([]);
  await saveCategories([]);
  // Tell content script to re-initialise defaults
  notifyContentScript("RESET_DEFAULTS");
  window.close();
});

function notifyContentScript(type: string) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type });
    }
  });
}
