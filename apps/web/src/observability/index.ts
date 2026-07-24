import type { AnalyticsProvider } from "@saknaha/providers";
import { observabilityConfig } from "./config";
import {
  addPerformanceBreadcrumb,
  captureApplicationError,
  initializeMonitoring,
} from "./instrument";
import {
  isAllowedAnalyticsEvent,
  normalizeAnalyticsRoute,
  sanitizeAnalyticsProperties,
} from "./privacy";

type PostHogClient = (typeof import("posthog-js"))["default"];
let posthogClient: PostHogClient | null = null;
let initialization: Promise<void> | null = null;
let historyInstrumented = false;

async function initializePostHog() {
  if (
    !observabilityConfig.posthog.enabled ||
    !observabilityConfig.posthog.key ||
    !observabilityConfig.posthog.host
  ) {
    return;
  }
  const { default: posthog } = await import("posthog-js");
  posthog.init(observabilityConfig.posthog.key, {
    api_host: observabilityConfig.posthog.host,
    defaults: "2026-05-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "memory",
    person_profiles: "never",
    mask_all_text: true,
    mask_all_element_attributes: true,
    secure_cookie: window.location.protocol === "https:",
  });
  posthogClient = posthog;
}

export const posthogAnalyticsProvider: AnalyticsProvider = {
  capability: "analytics",
  provider: "posthog",
  async capture(event) {
    if (!isAllowedAnalyticsEvent(event.name)) return;
    await initializeObservability();
    posthogClient?.capture(event.name, sanitizeAnalyticsProperties(event.properties));
  },
};

function capturePageView() {
  const route = normalizeAnalyticsRoute(window.location.pathname);
  void posthogAnalyticsProvider.capture({
    name: "page_view",
    properties: { route, source: "spa_navigation" },
    createdAt: new Date().toISOString(),
  });
}

function instrumentHistory() {
  if (historyInstrumented) return;
  historyInstrumented = true;
  const pushState = window.history.pushState.bind(window.history);
  const replaceState = window.history.replaceState.bind(window.history);
  window.history.pushState = (...args) => {
    pushState(...args);
    queueMicrotask(capturePageView);
  };
  window.history.replaceState = (...args) => {
    replaceState(...args);
    queueMicrotask(capturePageView);
  };
  window.addEventListener("popstate", capturePageView);
}

async function initializeWebVitals() {
  if (
    !observabilityConfig.webVitals.enabled ||
    Math.random() > observabilityConfig.webVitals.sampleRate
  ) {
    return;
  }
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
  const report = (metric: {
    name: string;
    value: number;
    delta: number;
    rating: string;
    navigationType: string;
  }) => {
    addPerformanceBreadcrumb(metric.name, metric.value, metric.rating);
    void posthogAnalyticsProvider.capture({
      name: "web_vital",
      properties: {
        metric: metric.name,
        value: Math.round(metric.value * 1000) / 1000,
        delta: Math.round(metric.delta * 1000) / 1000,
        rating: metric.rating,
        navigation_type: metric.navigationType,
        route: normalizeAnalyticsRoute(window.location.pathname),
      },
      createdAt: new Date().toISOString(),
    });
  };
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}

export function initializeObservability() {
  initialization ??= Promise.allSettled([
    initializeMonitoring(),
    initializePostHog(),
    initializeWebVitals(),
  ])
    .then(() => {
      instrumentHistory();
      capturePageView();
      void posthogAnalyticsProvider.capture({
        name: "app_loaded",
        properties: {
          environment: observabilityConfig.environment,
          app_version: observabilityConfig.release ?? "unversioned",
        },
        createdAt: new Date().toISOString(),
      });
    })
    .catch((error: unknown) => {
      captureApplicationError(error, "observability_initialization");
    });
  return initialization;
}

export function scheduleObservabilityInitialization() {
  const initialize = () => void initializeObservability();
  const requestIdle = Reflect.get(window, "requestIdleCallback") as
    ((callback: () => void, options: { timeout: number }) => number) | undefined;
  if (requestIdle) {
    requestIdle(initialize, { timeout: 2_000 });
  } else {
    globalThis.setTimeout(initialize, 1_000);
  }
}

export { captureApplicationError } from "./instrument";
