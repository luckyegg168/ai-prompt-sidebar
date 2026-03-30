import {
  Template,
  Category,
  Settings,
  TabGroup,
  DefaultsManifest,
  TemplateFile,
  DEFAULT_SETTINGS,
  extractVariables,
} from "../models/template";
import { StorageError, TemplateError, logError } from "../utils";

type StorageData = {
  templates: Template[];
  categories: Category[];
  settings: Settings;
  tabGroups: TabGroup[];
  defaultPrompts: Record<string, string[]>; // tabGroupId -> prompts
};

function getStorage(): typeof chrome.storage.local {
  return chrome.storage.local;
}

/**
 * Load all data from storage with error handling
 */
export async function loadAll(): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    getStorage().get(
      ["templates", "categories", "settings", "tabGroups", "defaultPrompts"],
      (result) => {
        if (chrome.runtime.lastError) {
          const error = new StorageError(
            chrome.runtime.lastError.message ?? "Unknown storage error",
            undefined,
            "get"
          );
          logError(error, { module: "storage/templates", function: "loadAll" });
          reject(error);
          return;
        }
        resolve({
          templates: result.templates ?? [],
          categories: result.categories ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) },
          tabGroups: result.tabGroups ?? [],
          defaultPrompts: result.defaultPrompts ?? {},
        });
      }
    );
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

export async function getTabGroups(): Promise<TabGroup[]> {
  const data = await loadAll();
  return data.tabGroups;
}

export async function getDefaultPrompts(): Promise<Record<string, string[]>> {
  const data = await loadAll();
  return data.defaultPrompts;
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  return new Promise((resolve, reject) => {
    getStorage().set({ templates }, () => {
      if (chrome.runtime.lastError) {
        const error = new StorageError(
          chrome.runtime.lastError.message ?? "Unknown storage error",
          "templates",
          "set"
        );
        logError(error, {
          module: "storage/templates",
          function: "saveTemplates",
        });
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function saveCategories(categories: Category[]): Promise<void> {
  return new Promise((resolve, reject) => {
    getStorage().set({ categories }, () => {
      if (chrome.runtime.lastError) {
        const error = new StorageError(
          chrome.runtime.lastError.message ?? "Unknown storage error",
          "categories",
          "set"
        );
        logError(error, {
          module: "storage/templates",
          function: "saveCategories",
        });
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    getStorage().set({ settings }, () => {
      if (chrome.runtime.lastError) {
        const error = new StorageError(
          chrome.runtime.lastError.message ?? "Unknown storage error",
          "settings",
          "set"
        );
        logError(error, {
          module: "storage/templates",
          function: "saveSettings",
        });
        reject(error);
        return;
      }
      resolve();
    });
  });
}

/**
 * Add a new template with validation and error handling
 */
export async function addTemplate(
  partial: Omit<Template, "id" | "variables" | "createdAt" | "updatedAt">
): Promise<Template> {
  // Validate input
  if (!partial.name || partial.name.trim().length === 0) {
    throw new TemplateError("Template name is required", undefined, "create");
  }
  if (!partial.content || partial.content.trim().length === 0) {
    throw new TemplateError(
      "Template content is required",
      undefined,
      "create"
    );
  }

  const now = Date.now();
  const template: Template = {
    ...partial,
    id: crypto.randomUUID(),
    variables: extractVariables(partial.content),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const templates = await getTemplates();

    // Check for duplicate names in the same category
    const duplicate = templates.find(
      (t) => t.name === partial.name && t.category === partial.category
    );
    if (duplicate) {
      console.warn("[AISidebar] Duplicate template name:", partial.name);
    }

    await saveTemplates([...templates, template]);
    return template;
  } catch (error) {
    const err =
      error instanceof TemplateError
        ? error
        : new TemplateError(
            error instanceof Error ? error.message : "Failed to add template",
            undefined,
            "create"
          );
    logError(err, { module: "storage/templates", function: "addTemplate" });
    throw err;
  }
}

/**
 * Update a template with error handling
 */
export async function updateTemplate(
  id: string,
  partial: Partial<
    Pick<
      Template,
      "name" | "category" | "content" | "platform" | "tags" | "isFavorite"
    >
  >
): Promise<Template | null> {
  try {
    const templates = await getTemplates();
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) {
      console.warn("[AISidebar] Template not found:", id);
      return null;
    }

    // Validate content if being updated
    if (partial.content !== undefined && partial.content.trim().length === 0) {
      throw new TemplateError("Template content cannot be empty", id, "update");
    }

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
  } catch (error) {
    const err =
      error instanceof TemplateError
        ? error
        : new TemplateError(
            error instanceof Error
              ? error.message
              : "Failed to update template",
            id,
            "update"
          );
    logError(err, { module: "storage/templates", function: "updateTemplate" });
    throw err;
  }
}

/**
 * Delete a template with error handling
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const templates = await getTemplates();
    const exists = templates.some((t) => t.id === id);
    if (!exists) {
      console.warn("[AISidebar] Template not found for deletion:", id);
      return; // Already deleted or never existed
    }
    await saveTemplates(templates.filter((t) => t.id !== id));
  } catch (error) {
    const err =
      error instanceof TemplateError
        ? error
        : new TemplateError(
            error instanceof Error
              ? error.message
              : "Failed to delete template",
            id,
            "delete"
          );
    logError(err, { module: "storage/templates", function: "deleteTemplate" });
    throw err;
  }
}

/**
 * Load defaults from the manifest-based split JSON files.
 * defaults.json is now a manifest referencing individual category files.
 */
export async function initDefaults(defaultsUrl: string): Promise<void> {
  // Use a sentinel flag to prevent race conditions across multiple tabs
  const result = await new Promise<Record<string, unknown>>(
    (resolve, reject) => {
      getStorage().get({ templates: [], aps_initialized: false }, (res) => {
        if (chrome.runtime.lastError) {
          reject(
            new StorageError(
              chrome.runtime.lastError.message ?? "Unknown storage error",
              "aps_initialized",
              "get"
            )
          );
          return;
        }
        resolve(res);
      });
    }
  ).catch((err) => {
    logError(err, { module: "storage/templates", function: "initDefaults" });
    return { templates: [], aps_initialized: false };
  });

  if (
    result.aps_initialized ||
    (Array.isArray(result.templates) &&
      (result.templates as unknown[]).length > 0)
  ) {
    return;
  }

  try {
    // Load manifest
    const manifestResp = await fetch(defaultsUrl);
    if (!manifestResp.ok) {
      throw new Error(`Failed to load manifest: HTTP ${manifestResp.status}`);
    }
    const manifest = (await manifestResp.json()) as DefaultsManifest;

    // Validate manifest
    if (
      !manifest.files ||
      !Array.isArray(manifest.files) ||
      manifest.files.length === 0
    ) {
      throw new Error("Invalid manifest format: missing files array");
    }

    // Resolve base URL for loading individual files
    const baseUrl = defaultsUrl.substring(0, defaultsUrl.lastIndexOf("/") + 1);

    // Load all referenced files in parallel with retry logic
    const filePromises = manifest.files.map(async (fileName) => {
      const resp = await fetch(baseUrl + fileName);
      if (!resp.ok) {
        throw new Error(`Failed to load ${fileName}: HTTP ${resp.status}`);
      }
      const data = await resp.json();

      // Validate file data
      if (!data.categories || !data.templates) {
        throw new Error(`Invalid file format for ${fileName}`);
      }

      return data as TemplateFile;
    });

    const fileData = await Promise.all(filePromises);

    // Merge all categories and templates
    const now = Date.now();
    const allCategories: Category[] = [];
    const allTemplates: Template[] = [];
    const allDefaultPrompts: Record<string, string[]> = {};

    for (let i = 0; i < fileData.length; i++) {
      const data = fileData[i];
      const tabGroup = manifest.tabGroups?.find(
        (tg) => tg.file === manifest.files[i]
      );

      // Collect categories
      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          allCategories.push(cat);
        }
      }

      // Collect templates with validation
      if (Array.isArray(data.templates)) {
        for (const t of data.templates) {
          // Skip invalid templates
          if (!t.name || !t.content) {
            console.warn("[AISidebar] Skipping invalid template:", t);
            continue;
          }
          allTemplates.push({
            ...t,
            id: crypto.randomUUID(),
            variables:
              t.variables && t.variables.length > 0
                ? t.variables
                : extractVariables(t.content),
            createdAt: now,
            updatedAt: now,
          } as Template);
        }
      }

      // Collect default prompts
      if (
        data.defaultPrompts &&
        Array.isArray(data.defaultPrompts) &&
        tabGroup
      ) {
        allDefaultPrompts[tabGroup.id] = data.defaultPrompts;
      }
    }

    // Atomic write with sentinel to prevent double-init from parallel tabs
    await new Promise<void>((resolve, reject) => {
      getStorage().set(
        {
          templates: allTemplates,
          categories: allCategories,
          tabGroups: manifest.tabGroups ?? [],
          defaultPrompts: allDefaultPrompts,
          aps_initialized: true,
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(
              new StorageError(
                chrome.runtime.lastError.message ?? "Unknown storage error",
                undefined,
                "set"
              )
            );
            return;
          }
          resolve();
        }
      );
    });

    console.log("[AISidebar] Defaults initialized:", {
      categories: allCategories.length,
      templates: allTemplates.length,
    });
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      module: "storage/templates",
      function: "initDefaults",
    });
    console.error("[AISidebar] Failed to load defaults:", err);
  }
}
