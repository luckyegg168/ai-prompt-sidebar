/**
 * Adapters barrel file
 */

export {
  PlatformAdapter,
  detectAdapter,
  dispatchInput,
  setContentEditableText,
  __registerAdapter,
  __clearAdapters,
  __getAllAdapters,
} from "./base";

export { GrokAdapter } from "./grok";
export { GeminiAdapter } from "./gemini";
export { ChatGPTAdapter } from "./chatgpt";
export { ClaudeAdapter } from "./claude";

// Auto-register all adapters
import { __registerAdapter } from "./base";
import { GrokAdapter } from "./grok";
import { GeminiAdapter } from "./gemini";
import { ChatGPTAdapter } from "./chatgpt";
import { ClaudeAdapter } from "./claude";

__registerAdapter(new GrokAdapter());
__registerAdapter(new GeminiAdapter());
__registerAdapter(new ChatGPTAdapter());
__registerAdapter(new ClaudeAdapter());
