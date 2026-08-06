import type { LlmProvider, CandidateContext } from '../extractor.js';
import { buildExtractionPrompt, parseLlmJsonResponse } from '../extractor.js';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';

  async extract(content: string, sourceType: string): Promise<CandidateContext[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }

    let AnthropicClass: new (config: { apiKey: string }) => unknown;
    try {
      const mod = await import('@anthropic-ai/sdk');
      AnthropicClass = (mod.default || mod.Anthropic) as new (config: { apiKey: string }) => unknown;
    } catch {
      throw new Error('@anthropic-ai/sdk package not installed. Run: npm install @anthropic-ai/sdk');
    }

    const prompt = buildExtractionPrompt(content, sourceType);
    const model = process.env.LLM_MODEL || 'claude-3-5-haiku-latest';

    const client = new AnthropicClass({ apiKey }) as unknown as {
      messages: {
        create: (params: Record<string, unknown>) => Promise<{
          content: { type: string; text: string }[];
        }>;
      };
    };

    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      temperature: 0.1,
      system: 'You are a constraint extraction engine. Respond ONLY with valid JSON. No markdown, no explanation.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n');

    return parseLlmJsonResponse(text);
  }
}
