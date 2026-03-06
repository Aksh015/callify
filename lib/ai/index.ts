import { ExternalFreeProvider } from "./externalFreeProvider";
import { SelfHostedProvider } from "./selfHostedProvider";
import type { AIProvider, AiProviderMode } from "./types";

export function getAIProvider(mode?: AiProviderMode): AIProvider {
  const resolvedMode = mode || (process.env.AI_PROVIDER_MODE as AiProviderMode) || "external_free";

  if (resolvedMode === "self_hosted") {
    return new SelfHostedProvider();
  }

  if (resolvedMode === "sarvam") {
    return new ExternalFreeProvider();
  }

  return new ExternalFreeProvider();
}
