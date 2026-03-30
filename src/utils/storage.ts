/**
 * Storage utility functions for chrome.storage.local
 */

/**
 * Get value from chrome.storage.local with Promise wrapper
 */
export async function getFromStorage<T>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? defaultValue);
    });
  });
}

/**
 * Set value to chrome.storage.local with Promise wrapper
 */
export async function setToStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Remove value from chrome.storage.local with Promise wrapper
 */
export async function removeFromStorage(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

/**
 * Get multiple values from chrome.storage.local
 */
export async function getMultipleFromStorage<T extends Record<string, unknown>>(
  keys: (keyof T)[]
): Promise<Partial<T>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys as string[], (result) => {
      resolve(result as Partial<T>);
    });
  });
}

/**
 * Clear all chrome.storage.local
 */
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

/**
 * Storage change listener helper
 */
export function onStorageChange<T>(
  key: string,
  callback: (newValue: T | undefined, oldValue: T | undefined) => void
): () => void {
  const listener = (changes: {
    [key: string]: chrome.storage.StorageChange;
  }) => {
    if (changes[key]) {
      callback(
        changes[key].newValue as T | undefined,
        changes[key].oldValue as T | undefined
      );
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
