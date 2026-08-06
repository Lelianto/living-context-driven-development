declare module 'openai' {
  const OpenAI: new (config: { apiKey: string }) => unknown;
  export default OpenAI;
  export { OpenAI };
}

declare module '@anthropic-ai/sdk' {
  const Anthropic: new (config: { apiKey: string }) => unknown;
  export default Anthropic;
  export { Anthropic };
}
