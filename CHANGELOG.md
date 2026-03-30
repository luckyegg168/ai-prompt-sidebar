# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint and Prettier configuration for code quality
- Jest testing framework with unit tests for templates, DOM utils, and adapters
- GitHub Actions CI/CD workflow for automated testing
- Error handling utilities with custom error classes
- Platform detection utilities
- Toast notification utilities
- Storage utilities with Promise wrappers

### Changed
- Split platform adapters into separate files (Grok, Gemini, ChatGPT, Claude)
- Enhanced error handling in storage operations with validation
- Improved `initDefaults()` with better error recovery and logging
- Updated manifest.json with `host_permissions` and CSP policy
- Moved `contextMenus` to optional permissions

### Fixed
- Template validation to prevent empty name/content
- Storage operation error handling with proper rejection

### Technical
- Added TypeScript strict mode support
- Added type checking script (`npm run typecheck`)
- Added lint and format scripts
- Added test coverage reporting

## [1.0.0] - 2025-01-XX

### Added
- Initial release
- Support for Grok, Gemini, ChatGPT, and Claude platforms
- 27+ built-in templates for financial analysis, image generation, and video generation
- Variable substitution with `{{variable}}` syntax
- Template management (create, edit, delete, import/export)
- Favorites system
- Tag-based filtering
- Dark/light theme support
- Customizable sidebar width
- Keyboard shortcut (Ctrl+Shift+P / Cmd+Shift+P)
- Context menu integration
