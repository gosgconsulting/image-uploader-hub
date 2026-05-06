import { getLlmGatewayApiKey } from "./llmGatewayKey.ts";

/**
 * Claude model ids that LLM Gateway may route to aws-bedrock. Use the
 * `anthropic/` prefix so the gateway uses direct Anthropic when only that key
 * is configured (avoids Bedrock 403). Mirrors the list in the Sparti project's
 * `_shared/llmGateway.ts` so behaviour stays consistent across functions.
 */
const CLAUDE_MODEL_IDS = new Set([
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5",
]);

function normalizeModelForGateway(model: string): string {
  const m = String(model ?? "").trim();
  if (!m) return "gpt-4o";
  if (m.includes("/")) return m;
  if (CLAUDE_MODEL_IDS.has(m)) return `anthropic/${m}`;
  return m;
}

/**
 * Call the LLM Gateway chat completions API directly. The same secret is
 * also used by the project's `llmgateway-chat` edge function — this helper
 * just lets internal functions skip the extra hop.
 */
export async function llmGatewayChat(body: Record<string, unknown>): Promise<unknown> {
  const apiKey = getLlmGatewayApiKey();
  const model = (body.model as string) ?? "gpt-4o";
  const gatewayModel = normalizeModelForGateway(model);
  const payload = { ...body, model: gatewayModel };

  const res = await fetch("https://api.llmgateway.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`LLM Gateway error (${res.status}): ${text}`);
  return JSON.parse(text);
}
