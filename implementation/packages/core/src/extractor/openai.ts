import type { LlmProvider, CandidateContext } from '../extractor.js';
import { buildExtractionPrompt, parseLlmJsonResponse } from '../extractor.js';

export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';

  async extract(content: string, sourceType: string): Promise<CandidateContext[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    let OpenAIClass: new (config: { apiKey: string }) => unknown;
    try {
      const mod = await import('openai');
      OpenAIClass = (mod.default || mod.OpenAI) as new (config: { apiKey: string }) => unknown;
    } catch {
      throw new Error('openai package not installed. Run: npm install openai');
    }

    const prompt = buildExtractionPrompt(content, sourceType);
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';

    const client = new OpenAIClass({ apiKey }) as unknown as {
      chat: {
        completions: {
          create: (params: Record<string, unknown>) => Promise<{
            choices: { message: { content: string | null } }[];
          }>;
        };
      };
    };

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a constraint extraction engine. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content || '';
    return parseLlmJsonResponse(text);
  }
}
