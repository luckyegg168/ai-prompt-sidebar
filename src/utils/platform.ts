/**
 * Platform detection utilities
 */

export type PlatformType = "grok" | "gemini" | "chatgpt" | "claude" | "unknown";

const PLATFORM_PATTER: Record<PlatformType, RegExp[]> = {
  grok: [/^https:\/\/x\.com\/i\/grok/, /^https:\/\/grok\.com/],
  gemini: [/^https:\/\/gemini\.google\.com/],
  chatgpt: [/^https:\/\/chatgpt\.com/],
  claude: [/^https:\/\/claude\.ai/],
  unknown: [],
};

/**
 * Detect current platform from URL
 */
export function detectPlatform(): PlatformType {
  const url = window.location.href;

  for (const [platform, patterns] of Object.entries(PLATFORM_PATTER)) {
    if (platform === "unknown") continue;
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform as PlatformType;
      }
    }
  }

  return "unknown";
}

/**
 * Check if current URL matches a specific platform
 */
export function isPlatform(platform: PlatformType): boolean {
  return detectPlatform() === platform;
}

/**
 * Get supported platforms list
 */
export function getSupportedPlatforms(): PlatformType[] {
  return ["grok", "gemini", "chatgpt", "claude"];
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: PlatformType): string {
  const names: Record<PlatformType, string> = {
    grok: "Grok",
    gemini: "Gemini",
    chatgpt: "ChatGPT",
    claude: "Claude",
    unknown: "Unknown",
  };
  return names[platform];
}

/**
 * Get platform URL patterns for manifest
 */
export function getPlatformUrlPatterns(): string[] {
  return [
    "https://x.com/i/grok*",
    "https://grok.com/*",
    "https://gemini.google.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
  ];
}
