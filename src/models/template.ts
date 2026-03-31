export interface Variable {
  name: string;
  placeholder?: string;
  defaultValue?: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: Variable[];
  platform?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface TabGroup {
  id: string;
  name: string;
  icon: string;
  file: string;
  order: number;
}

export interface DefaultsManifest {
  files: string[];
  tabGroups: TabGroup[];
}

export interface TemplateFile {
  categories: Category[];
  templates: Omit<Template, "id" | "createdAt" | "updatedAt">[];
  defaultPrompts?: string[];
}

export interface Settings {
  sidebarWidth: number;
  autoShow: boolean;
  defaultPlatform: string;
  theme: "auto" | "light" | "dark";
}

export const DEFAULT_SETTINGS: Settings = {
  sidebarWidth: 340,
  autoShow: true,
  defaultPlatform: "",
  theme: "auto",
};

export type ScheduleType = "once" | "daily" | "weekly";
export type PlatformKey = "grok" | "gemini" | "chatgpt" | "claude";

export const PLATFORM_URLS: Record<PlatformKey, string> = {
  grok: "https://grok.com/",
  gemini: "https://gemini.google.com/",
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/",
};

export interface ScheduledTask {
  id: string;
  name: string;
  templateId: string;
  platform: PlatformKey;
  /** Variables to fill into template at send time */
  variables: Record<string, string>;
  scheduleType: ScheduleType;
  /** ISO datetime string for 'once'; HH:mm string for 'daily'/'weekly' */
  scheduleTime: string;
  /** Days of week (0=Sun … 6=Sat) for 'weekly' */
  weekdays: number[];
  enabled: boolean;
  autoSubmit: boolean;
  lastRunAt?: number;
  nextRunAt: number;
  createdAt: number;
}

/** Extract {{variable}} placeholders from template content */
export function extractVariables(content: string): Variable[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const seen = new Set<string>();
  const vars: Variable[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    if (!seen.has(name)) {
      seen.add(name);
      vars.push({ name, placeholder: "", defaultValue: "" });
    }
  }
  return vars;
}

/** Replace {{variable}} with actual values */
export function fillTemplate(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return values[trimmed] ?? `{{${trimmed}}}`;
  });
}
