import type { LlmProvider, CandidateContext } from '../extractor.js';
import { buildExtractionPrompt, parseLlmJsonResponse } from '../extractor.js';

interface OllamaResponse {
  message?: { content?: string };
  error?: string;
}

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  async extract(content: string, sourceType: string): Promise<CandidateContext[]> {
    const prompt = buildExtractionPrompt(content, sourceType);
    const model = process.env.LLM_MODEL || 'llama3.2';

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.1, num_predict: 2048 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as OllamaResponse;

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`);
    }

    const text = data.message?.content || '';
    return parseLlmJsonResponse(text);
  }
}
