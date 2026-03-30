// Mock chrome API for testing
const mockChrome = {
  runtime: {
    getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn((_keys: string | string[] | Record<string, unknown>, callback?: (result: Record<string, unknown>) => void) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((_items: Record<string, unknown>, callback?: () => void) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((_keys: string | string[], callback?: () => void) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    query: jest.fn((_queryInfo: Record<string, unknown>, callback?: (tabs: { id: number; url: string }[]) => void) => {
      if (callback) callback([{ id: 1, url: "https://example.com" }]);
    }),
    sendMessage: jest.fn(),
  },
  contextMenus: {
    create: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: jest.fn(),
    },
  },
};

(global as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, "randomUUID", {
  value: jest.fn(() => "mock-uuid-" + Math.random().toString(36).substr(2, 9)),
  writable: true,
});
