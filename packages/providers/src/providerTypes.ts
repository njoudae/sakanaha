export type ProviderCapability =
  "maps" | "sms" | "email" | "push" | "analytics" | "monitoring" | "storage" | "cost";

export type ProviderStatus = "disabled" | "enabled";

export interface ProviderHealth {
  status: "healthy" | "degraded" | "unavailable";
  checkedAt: string;
  message?: string;
}

export interface ProviderUsageContext {
  userId?: string;
  ownerProfileId?: string;
  propertyId?: string;
  serviceProviderProfileId?: string;
  serviceOfferingId?: string;
  region?: string;
  requestId?: string;
}

export interface ProviderUsageEvent {
  capability: ProviderCapability;
  provider: string;
  operation: string;
  unitCount: number;
  status: "success" | "failed" | "skipped";
  estimatedCost?: number;
  currency?: string;
  context?: ProviderUsageContext;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProviderAdapterBase<TProviderName extends string> {
  readonly capability: ProviderCapability;
  readonly provider: TProviderName;
  healthCheck?(): Promise<ProviderHealth>;
}

export interface ProviderConfig<TProviderName extends string = string> {
  provider: TProviderName;
  status: ProviderStatus;
}

export type ProviderRegistry<TCapability extends string, TAdapter> = Readonly<
  Partial<Record<TCapability, TAdapter>>
>;
