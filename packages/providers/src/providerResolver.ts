import type { ProviderConfig, ProviderRegistry } from "./providerTypes";

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

export function resolveProvider<TProviderName extends string, TAdapter>(
  config: ProviderConfig<TProviderName>,
  registry: ProviderRegistry<TProviderName, TAdapter>,
): TAdapter | null {
  if (config.status === "disabled" || config.provider === "disabled") {
    return null;
  }

  const adapter = registry[config.provider];
  if (adapter === undefined) {
    throw new ProviderConfigurationError(`Provider "${config.provider}" is not registered.`);
  }

  return adapter;
}
