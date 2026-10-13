import { SITE } from "@/lib/site";

import { CHAT_LIMITS } from "./limits";

// Cheap, follows instructions closely, reads images. Any OpenRouter model id can replace it.
export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";
export const FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

/** One model call gives up after this, so a slow model hands over to the next one in time. */
const REQUEST_TIMEOUT_MS = 22_000;
/** The whole turn, retries included, must finish inside the route's 60s limit. */
export const TURN_BUDGET_MS = 52_000;
/** Past this, one failed call is not followed by more attempts. */
const OUT_OF_ATTEMPTS_MS = 30_000;

export type ModelPart =
  | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }
  | { type: "image_url"; image_url: { url: string } };
export type ModelMessage = { role: "system" | "user" | "assistant"; content: string | ModelPart[] };

/** Token counts for one or more calls, kept so the owner can see what a conversation costs. */
export type Usage = { input: number; output: number; cached: number; reasoning: number };

export const addUsage = (total: Usage | undefined, more: Usage): Usage => ({
  input: (total?.input ?? 0) + more.input,
  output: (total?.output ?? 0) + more.output,
  cached: (total?.cached ?? 0) + more.cached,
  reasoning: (total?.reasoning ?? 0) + more.reasoning,
});

export type Completion = { text: string; costUsd: number; usage: Usage };

/** How much the model may think first. "off" switches it off for models that think by default. */
export type Thinking = "low" | "medium" | "high" | "off";

export type CompleteOptions = {
  think?: Thinking;
  /** Ask for a JSON object. Default true. */
  json?: boolean;
  maxTokens?: number;
};

/** A failed call to OpenRouter, with the status and what it said, so the owner can see why. */
export class ModelError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Set once a model refuses a reasoning setting, so later turns stop trying it. */
let reasoningRefused = false;

const isAnthropic = (model: string) => model.startsWith("anthropic/");

/** Cache markers only mean something to Anthropic models; every other model gets plain text. */
function shapeFor(model: string, messages: ModelMessage[]): ModelMessage[] {
  if (isAnthropic(model)) return messages;
  return messages.map((message) =>
    message.role === "system" && Array.isArray(message.content)
      ? { ...message, content: message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n\n") }
      : message,
  );
}

type Step = { model: string; json: boolean; think: boolean };

async function request(messages: ModelMessage[], step: Step, options: CompleteOptions, deadline: number): Promise<Completion> {
  const left = deadline - Date.now();
  if (left < 3000) throw new Error("The model took too long to answer.");

  const base = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const thinking = step.think ? options.think : undefined;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, left)),
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "http-referer": SITE.url,
      "x-title": SITE.name,
    },
    body: JSON.stringify({
      model: step.model,
      messages: shapeFor(step.model, messages),
      max_tokens: options.maxTokens ?? CHAT_LIMITS.maxOutputTokens,
      // Models that think only accept their own default temperature.
      ...(thinking && thinking !== "off" ? { reasoning: { effort: thinking } } : { temperature: 0.6 }),
      ...(thinking === "off" ? { reasoning: { enabled: false } } : {}),
      ...(step.json ? { response_format: { type: "json_object" } } : {}),
      usage: { include: true },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
    throw new ModelError(`OpenRouter ${res.status} (${step.model}): ${detail}`, res.status);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      cost?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
      prompt_tokens_details?: { cached_tokens?: number };
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };
  const usage = data.usage;
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    costUsd: Number(usage?.cost) || 0,
    usage: {
      input: Number(usage?.prompt_tokens) || 0,
      output: Number(usage?.completion_tokens) || 0,
      cached: Number(usage?.prompt_tokens_details?.cached_tokens) || 0,
      reasoning: Number(usage?.completion_tokens_details?.reasoning_tokens) || 0,
    },
  };
}

/**
 * One call with fallbacks: the chosen model with the reasoning setting and JSON mode, then without
 * the reasoning setting (some models refuse it), then without JSON mode (some models reject it),
 * then a second model. A bad key or no credit fails at once, since nothing else would work either.
 */
export async function complete(messages: ModelMessage[], deadline: number, options: CompleteOptions = {}): Promise<Completion> {
  const primary = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const fallback = process.env.OPENROUTER_FALLBACK_MODEL || FALLBACK_MODEL;
  const json = options.json !== false;

  const steps: Step[] = [];
  if (options.think && !reasoningRefused) steps.push({ model: primary, json, think: true });
  steps.push({ model: primary, json, think: false });
  if (json) steps.push({ model: primary, json: false, think: false });
  if (fallback !== primary) steps.push({ model: fallback, json, think: false });

  // Last resort when images are the problem: answer from the text alone, so the chat keeps working.
  const hasImages = messages.some((message) => Array.isArray(message.content) && message.content.some((part) => part.type === "image_url"));
  const textOnly: ModelMessage[] = messages.map((message) =>
    message.role === "user" && Array.isArray(message.content)
      ? {
          ...message,
          content: `${message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")}\n[The customer attached reference images, but you cannot see them right now. Acknowledge them, and ask what to take from each one.]`,
        }
      : message,
  );

  const started = Date.now();
  let last: unknown;
  let refusedThinking = false;
  for (const step of steps) {
    if (last && Date.now() - started > OUT_OF_ATTEMPTS_MS) break;
    if (deadline - Date.now() < 3000) break;
    try {
      const done = await request(messages, step, options, deadline);
      // The same model worked once the reasoning setting was dropped, so it was the setting.
      if (refusedThinking && !step.think && step.model === primary && step.json === json) reasoningRefused = true;
      return done;
    } catch (err) {
      last = err;
      if (err instanceof ModelError && [401, 402, 403].includes(err.status)) throw err;
      if (step.think && err instanceof ModelError && [400, 422].includes(err.status)) refusedThinking = true;
    }
  }
  if (hasImages) {
    try {
      return await request(textOnly, { model: primary, json: false, think: false }, options, deadline);
    } catch {
      // Report the original failure.
    }
  }
  throw last ?? new Error("The model took too long to answer.");
}
