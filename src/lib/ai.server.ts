import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import type { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Streams a structured-output call through Lovable AI and returns the validated object. */
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  instructions: string;
  prompt: string;
}): Promise<T> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new AiError("AI is not configured (missing LOVABLE_API_KEY).", 500);

  let status = 0;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      status = res.status;
      return res;
    },
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL) as any,
      instructions: opts.instructions,
      prompt: opts.prompt,
      output: Output.object({ schema: opts.schema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    return (await result.output) as T;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      throw new AiError("The AI returned an invalid response. Please try again.", 502);
    }
    if (status === 429) throw new AiError("AI is busy right now. Please wait a moment and retry.", 429);
    if (status === 402)
      throw new AiError("AI credits are exhausted for this workspace. Add credits to continue.", 402);
    if (status === 403) throw new AiError("AI access is not available for this workspace.", 403);
    console.error("AI call failed", e);
    throw new AiError("AI request failed. Please try again.", status || 500);
  }
}
