import { GeminiProvider } from './geminiProvider.js';
import { AIProvider } from './aiProvider.js';

// Singleton instance - only created once
let _aiProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!_aiProvider) {
    _aiProvider = new GeminiProvider();
  }
  return _aiProvider!;
}

// Export the singleton instance directly for convenience
export const aiProvider = getAIProvider();