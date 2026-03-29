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
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
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
