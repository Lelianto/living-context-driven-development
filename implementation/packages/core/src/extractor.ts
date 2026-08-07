import type { RegisteredSource } from './source-connector.js';

export interface CandidateContext {
  title: string;
  description: string;
  category?: string;
  severity?: string;
  source_location?: string;
  confidence: number;
  raw_text: string;
}

export interface LlmProvider {
  readonly name: string;
  extract(content: string, sourceType: string): Promise<CandidateContext[]>;
}

export function buildExtractionPrompt(content: string, sourceType: string): string {
  return `You are a constraint extraction engine. Given a document, identify all constraint-like statements.

A constraint is any statement that limits, governs, or defines how software should behave. Look for:
- Normative language: MUST, SHALL, REQUIRED, MUST NOT, SHALL NOT, PROHIBITED
- Policy statements: "all X must Y", "no X without Y"
- Technical requirements: "API responses must be under 200ms"
- Compliance rules: reference to regulations, standards (GDPR, PCI-DSS, HIPAA, OJK)
- Security rules: authentication, authorization, encryption requirements

Source type: ${sourceType}

Document content:
${content.slice(0, 6000)}

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "candidates": [
    {
      "title": "Short title summarizing the constraint",
      "description": "Full description of what is required",
      "category": "security|performance|compliance|architecture|testing|api|devops",
      "severity": "critical|high|medium|low|info",
      "source_location": "Section or paragraph reference",
      "confidence": 0.85
    }
  ]
}

If no constraints are found, return: { "candidates": [] }`;
}

export function parseLlmJsonResponse(text: string): CandidateContext[] {
  let jsonStr = text.trim();

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON object found in LLM response: ${text.slice(0, 200)}`);
  }

  let parsed: { candidates?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${jsonMatch[0].slice(0, 200)}`);
  }

  if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
    return [];
  }

  const validSeverities = new Set(['critical', 'high', 'medium', 'low', 'info']);

  return parsed.candidates.map((c: Record<string, unknown>) => ({
    title: String(c.title || '').slice(0, 256),
    description: String(c.description || '').slice(0, 16384),
    category: String(c.category || '') || undefined,
    severity: validSeverities.has(String(c.severity || '')) ? String(c.severity) : 'medium',
    source_location: c.source_location ? String(c.source_location) : undefined,
    confidence: Math.min(1, Math.max(0, Number(c.confidence) || 0.5)),
    raw_text: String(c.title || '') + ': ' + String(c.description || ''),
  }));
}

export class Extractor {
  private providers: Map<string, LlmProvider> = new Map();
  private initialized = false;
  private providerWarnings: string[] = [];

  async init(): Promise<void> {
    if (this.initialized) return;

    const { OllamaProvider } = await import('./extractor/ollama.js');
    const ollama = new OllamaProvider();
    this.providers.set(ollama.name, ollama);

    if (process.env.OPENAI_API_KEY) {
      try {
        const { OpenAIProvider } = await import('./extractor/openai.js');
        this.providers.set('openai', new OpenAIProvider());
      } catch {
        this.providerWarnings.push('OpenAI: API key set but "openai" package not installed. Run: npm install openai');
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { AnthropicProvider } = await import('./extractor/anthropic.js');
        this.providers.set('anthropic', new AnthropicProvider());
      } catch {
        this.providerWarnings.push('Anthropic: API key set but "@anthropic-ai/sdk" package not installed. Run: npm install @anthropic-ai/sdk');
      }
    }

    this.initialized = true;
  }

  getProviderWarnings(): string[] {
    return this.providerWarnings;
  }

  getDefaultProviderName(): string {
    if (this.providers.has('openai')) return 'openai';
    if (this.providers.has('anthropic')) return 'anthropic';
    return 'ollama';
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async extract(source: RegisteredSource, providerName?: string): Promise<CandidateContext[]> {
    await this.init();

    const name = providerName || this.getDefaultProviderName();
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(
        `Provider "${name}" not available. Available: ${this.getAvailableProviders().join(', ')}`
      );
    }

    let content: string;
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');
      const changesLog = join(process.cwd(), '.lcdd', 'sources', '.changes.log');
      if (existsSync(changesLog)) {
        content = readFileSync(changesLog, 'utf-8').slice(0, 8000);
      } else {
        content = `Source: ${source.url}\nType: ${source.type}\nLabel: ${source.label || 'N/A'}\n\n(No change history yet. Run lcd source check to populate.)`;
      }
    } catch {
      content = `Source: ${source.url}\nType: ${source.type}\nLabel: ${source.label || 'N/A'}`;
    }

    return provider.extract(content, source.type);
  }
}
