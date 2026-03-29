import {
  Template,
  Category,
  Settings,
  DEFAULT_SETTINGS,
  extractVariables,
} from "../models/template";

type StorageData = {
  templates: Template[];
  categories: Category[];
  settings: Settings;
};

function getStorage(): typeof chrome.storage.local {
  return chrome.storage.local;
}

export async function loadAll(): Promise<StorageData> {
  return new Promise((resolve) => {
    getStorage().get(["templates", "categories", "settings"], (result) => {
      resolve({
        templates: result.templates ?? [],
        categories: result.categories ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) },
      });
    });
  });
}

export async function getTemplates(): Promise<Template[]> {
  const data = await loadAll();
  return data.templates;
}

export async function getCategories(): Promise<Category[]> {
  const data = await loadAll();
  return data.categories;
}

export async function getSettings(): Promise<Settings> {
  const data = await loadAll();
  return data.settings;
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  return new Promise((resolve) => {
    getStorage().set({ templates }, resolve);
  });
}

export async function saveCategories(categories: Category[]): Promise<void> {
  return new Promise((resolve) => {
    getStorage().set({ categories }, resolve);
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    getStorage().set({ settings }, resolve);
  });
}

export async function addTemplate(
  partial: Omit<Template, "id" | "variables" | "createdAt" | "updatedAt">
): Promise<Template> {
  const now = Date.now();
  const template: Template = {
    ...partial,
    id: crypto.randomUUID(),
    variables: extractVariables(partial.content),
    createdAt: now,
    updatedAt: now,
  };
  const templates = await getTemplates();
  await saveTemplates([...templates, template]);
  return template;
}

export async function updateTemplate(
  id: string,
  partial: Partial<Pick<Template, "name" | "category" | "content" | "platform" | "tags" | "isFavorite">>
): Promise<Template | null> {
  const templates = await getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const updated: Template = {
    ...templates[idx],
    ...partial,
    updatedAt: Date.now(),
  };
  if (partial.content !== undefined) {
    updated.variables = extractVariables(partial.content);
  }
  const next = [...templates];
  next[idx] = updated;
  await saveTemplates(next);
  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates();
  await saveTemplates(templates.filter((t) => t.id !== id));
}

export async function initDefaults(defaultsUrl: string): Promise<void> {
  const data = await loadAll();
  if (data.templates.length > 0) return; // already initialised

  try {
    const resp = await fetch(defaultsUrl);
    const defaults = (await resp.json()) as {
      categories: Category[];
      templates: Omit<Template, "id" | "variables" | "createdAt" | "updatedAt">[];
    };

    const now = Date.now();
    const templates: Template[] = defaults.templates.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      variables: extractVariables(t.content),
      createdAt: now,
      updatedAt: now,
    }));

    await saveTemplates(templates);
    await saveCategories(defaults.categories);
  } catch (err) {
    console.error("[AISidebar] Failed to load defaults:", err);
  }
}
