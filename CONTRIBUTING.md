# Contributing to AI Prompt Sidebar

Thank you for your interest in contributing to AI Prompt Sidebar! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Templates](#adding-new-templates)
- [Adding New Platform Adapters](#adding-new-platform-adapters)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Keep discussions professional and on-topic

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ai-prompt-sidebar.git`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`

## Development Setup

### Prerequisites

- Node.js 20+
- npm 9+
- A Chromium-based browser (Chrome, Edge, Brave)

### Installing Dependencies

```bash
npm install
```

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Loading in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

## Project Structure

```
src/
├── adapters/          # Platform adapters (Grok, Gemini, ChatGPT, Claude)
├── background/        # Service worker
├── content/           # Content scripts (sidebar UI)
├── models/            # TypeScript type definitions
├── popup/             # Extension popup
├── storage/           # Storage operations
├── utils/             # Shared utilities
└── __tests__/         # Unit tests
templates/             # Template JSON files
```

## Coding Standards

### TypeScript

- Use strict mode (`strict: true` in tsconfig.json)
- Prefer `const` over `let`
- Use meaningful variable names
- Add type annotations for function parameters and return types
- Use interfaces for object shapes

### Code Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Max line length: 80 characters
- Use Prettier for formatting: `npm run format`

### Linting

```bash
# Check for lint errors
npm run lint

# Auto-fix when possible
npm run lint:fix
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in `src/__tests__/` directory
- Name test files: `*.test.ts`
- Use Jest's `describe` and `it` blocks
- Mock Chrome API using the provided setup in `jest.setup.ts`

Example:

```typescript
describe("MyFunction", () => {
  it("should return expected value", () => {
    const result = myFunction(input);
    expect(result).toBe(expectedValue);
  });
});
```

## Submitting Changes

1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes and write tests
3. Run verification: `npm run typecheck && npm run lint && npm run test`
4. Commit with clear messages: `git commit -m "feat: add new feature"`
5. Push to your fork
6. Open a Pull Request

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/config changes

Example:

```
feat: add image generation templates

Added 10 new templates for AI image generation.

Closes #123
```

## Adding New Templates

Templates are stored in JSON files under `templates/`. To add a new template:

1. Find the appropriate category file (e.g., `image-generation.json`)
2. Add a new template object:

```json
{
  "name": "My Template",
  "category": "圖片生成",
  "content": "Generate an image of {{description}}. Style: {{style}}.",
  "tags": ["text-to-image", "custom"],
  "variables": [
    { "name": "description", "placeholder": "Describe the image", "defaultValue": "a sunset" },
    { "name": "style", "placeholder": "Art style", "defaultValue": "photorealistic" }
  ]
}
```

3. Run `npm run build` and test in the browser

## Adding New Platform Adapters

To add support for a new AI platform:

1. Create a new adapter file in `src/adapters/`:

```typescript
// src/adapters/newplatform.ts
import { PlatformAdapter, dispatchInput, setContentEditableText } from "./base";

export class NewPlatformAdapter implements PlatformAdapter {
  name = "NewPlatform";

  matchUrl(url: string): boolean {
    return url.startsWith("https://newplatform.com");
  }

  getInputElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>("textarea");
  }

  setText(el: HTMLElement, text: string): void {
    if (el instanceof HTMLTextAreaElement) {
      el.value = text;
      dispatchInput(el);
    } else {
      setContentEditableText(el, text);
    }
  }

  submit(el: HTMLElement): void {
    const sendBtn = document.querySelector<HTMLElement>('button[aria-label="Send"]');
    if (sendBtn) {
      sendBtn.click();
      return;
    }
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  }

  getTheme(): "light" | "dark" {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
}
```

2. Export and register in `src/adapters/index.ts`:

```typescript
export { NewPlatformAdapter } from "./newplatform";
__registerAdapter(new NewPlatformAdapter());
```

3. Add URL patterns to `manifest.json`:

```json
"content_scripts": [{
  "matches": ["https://newplatform.com/*"],
  ...
}]
```

4. Add tests in `src/__tests__/adapters.test.ts`

## Questions?

Feel free to open an issue for questions or discussions about contributing.
