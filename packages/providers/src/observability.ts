import type { ProviderAdapterBase, ProviderConfig, ProviderUsageEvent } from "./providerTypes";

export type AnalyticsProviderName = "posthog" | "disabled";
export type MonitoringProviderName = "sentry" | "disabled";
export type CostProviderName = "convex" | "disabled";

export interface AnalyticsEvent {
  name: string;
  userId?: string;
  properties?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface MonitoringEvent {
  level: "info" | "warning" | "error";
  message: string;
  fingerprint?: string;
  tags?: Record<string, string>;
  context?: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsProvider extends ProviderAdapterBase<AnalyticsProviderName> {
  capture(event: AnalyticsEvent): Promise<void>;
}

export interface MonitoringProvider extends ProviderAdapterBase<MonitoringProviderName> {
  capture(event: MonitoringEvent): Promise<void>;
}

export interface CostUsageProvider extends ProviderAdapterBase<CostProviderName> {
  recordUsage(event: ProviderUsageEvent): Promise<void>;
}

export type AnalyticsProviderConfig = ProviderConfig<AnalyticsProviderName>;
export type MonitoringProviderConfig = ProviderConfig<MonitoringProviderName>;
export type CostProviderConfig = ProviderConfig<CostProviderName>;
