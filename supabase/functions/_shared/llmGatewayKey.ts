/**
 * Shared with the Sparti project's edge functions — `LLMGATEWAY_API_KEY` is
 * the project-level secret already provisioned for `llmgateway-chat`,
 * `ai-content-enhancer`, and other AI functions.
 */
export function getLlmGatewayApiKey(): string {
  const key = Deno.env.get("LLMGATEWAY_API_KEY");
  if (!key) throw new Error("LLMGATEWAY_API_KEY is not configured");
  return key;
}
