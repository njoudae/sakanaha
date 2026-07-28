#!/usr/bin/env node
import { readFile } from "node:fs/promises";

function optionsFrom(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) throw new Error(`Unexpected argument: ${item}`);
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) options[key] = true;
    else {
      options[key] = value;
      index += 1;
    }
  }
  return options;
}

function parseEnvironment(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      values[line] = "__present__";
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function valuesFromFile(path) {
  return path ? parseEnvironment(await readFile(path, "utf8")) : {};
}

function requireKeys(values, keys, { requireValues }) {
  const missing = keys.filter((key) => !(key in values));
  const empty = requireValues ? keys.filter((key) => !String(values[key] ?? "").trim()) : [];
  if (missing.length || empty.length) {
    const parts = [];
    if (missing.length) parts.push(`missing keys: ${missing.join(", ")}`);
    if (empty.length) parts.push(`empty values: ${empty.join(", ")}`);
    throw new Error(parts.join("; "));
  }
}

function assertHttps(values, keys) {
  for (const key of keys) {
    const value = values[key];
    if (!value) continue;
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${key} must be an absolute URL.`);
    }
    if (url.protocol !== "https:") throw new Error(`${key} must use HTTPS.`);
  }
}

const frontendKeys = [
  "VITE_CONVEX_URL",
  "VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED",
  "VITE_FEATURE_AUTH_GOOGLE_ENABLED",
  "VITE_FEATURE_AUTH_EMAIL_OTP_ENABLED",
  "VITE_FEATURE_AUTH_PHONE_OTP_ENABLED",
  "VITE_FEATURE_DATA_CONVEX_ENABLED",
  "VITE_FEATURE_MAPS_UNIVERSITY_DIRECTIONS_ENABLED",
  "VITE_FEATURE_MONITORING_SENTRY_ENABLED",
  "VITE_FEATURE_ANALYTICS_POSTHOG_ENABLED",
  "VITE_FEATURE_PERFORMANCE_WEB_VITALS_ENABLED",
  "VITE_APP_ENV",
  "VITE_APP_RELEASE",
  "VITE_SENTRY_TRACES_SAMPLE_RATE",
  "VITE_POSTHOG_HOST",
  "VITE_WEB_VITALS_SAMPLE_RATE",
];

const convexKeys = [
  "CONVEX_SITE_URL",
  "SITE_URL",
  "JWT_PRIVATE_KEY",
  "JWKS",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_EMAIL_OTP_WEBHOOK_URL",
  "AUTH_EMAIL_OTP_WEBHOOK_SECRET",
  "AUTH_PHONE_OTP_ENABLED",
  "SAKNAHA_EMAIL_PROVIDER",
  "SAKNAHA_EMAIL_WEBHOOK_URL",
  "SAKNAHA_EMAIL_WEBHOOK_SECRET",
  "SAKNAHA_APP_URL",
  "SAKNAHA_PUSH_PROVIDER",
  "SAKNAHA_ANALYTICS_PROVIDER",
  "SAKNAHA_MONITORING_PROVIDER",
  "SAKNAHA_STORAGE_PROVIDER",
  "SAKNAHA_COST_PROVIDER",
  "SAKNAHA_MAPS_PROVIDER",
  "SAKNAHA_MAPS_PAID_CALLS_ENABLED",
  "SAKNAHA_MAPS_CACHE_TTL_SECONDS",
  "SAKNAHA_MAPS_QUOTA_PER_MINUTE",
  "SAKNAHA_MAPS_CIRCUIT_BREAKER_FAILURE_THRESHOLD",
  "SAKNAHA_MAPS_CIRCUIT_BREAKER_COOLDOWN_MS",
  "GOOGLE_MAPS_API_KEY",
  "OPENSTREETMAP_USER_AGENT",
  "SAKNAHA_SMS_ENABLED",
  "SAKNAHA_SMS_EMERGENCY_DISABLED",
  "SAKNAHA_SMS_PROVIDER",
  "SAKNAHA_SMS_FALLBACK_PROVIDERS",
  "SAKNAHA_SMS_RETRY_COUNT",
  "SAKNAHA_SMS_OTP_TTL_SECONDS",
  "SAKNAHA_STORAGE_MAX_UPLOAD_BYTES",
];

const ciKeys = [
  "CONVEX_DEPLOY_KEY",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  "APP_HEALTH_URL",
];

const templateSecretKeys = [
  "JWT_PRIVATE_KEY",
  "JWKS",
  "AUTH_GOOGLE_SECRET",
  "AUTH_EMAIL_OTP_WEBHOOK_SECRET",
  "SAKNAHA_EMAIL_WEBHOOK_SECRET",
  "GOOGLE_MAPS_API_KEY",
  "MAPBOX_ACCESS_TOKEN",
  "MSEGAT_USERNAME",
  "MSEGAT_API_KEY",
  "TAQNY_BEARER_TOKEN",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "SENTRY_AUTH_TOKEN",
];

async function main() {
  const options = optionsFrom(process.argv.slice(2));
  const environment = options.environment;
  const source = options.source;
  if (!environment || !["development", "staging", "production"].includes(environment)) {
    throw new Error("--environment must be development, staging, or production.");
  }
  if (!source || !["template", "frontend", "convex", "ci"].includes(source)) {
    throw new Error("--source must be template, frontend, convex, or ci.");
  }

  const fileValues = await valuesFromFile(options.file);
  const featureValues = await valuesFromFile(options["feature-file"]);
  const runtimeValues = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined),
  );
  const values = { ...fileValues, ...featureValues, ...runtimeValues };
  const templateMode = source === "template";

  if (templateMode) {
    const populatedSecrets = templateSecretKeys.filter((key) =>
      String(fileValues[key] ?? "").trim(),
    );
    if (populatedSecrets.length) {
      throw new Error(
        `example environment contains populated secret values: ${populatedSecrets.join(", ")}`,
      );
    }
  }

  if (source === "frontend" || templateMode) {
    requireKeys(values, frontendKeys, { requireValues: !templateMode });
    if (values.VITE_APP_ENV && values.VITE_APP_ENV !== environment) {
      throw new Error(`VITE_APP_ENV must equal ${environment}.`);
    }
    if (!templateMode) {
      assertHttps(values, ["VITE_CONVEX_URL", "VITE_POSTHOG_HOST"]);
      if (values.VITE_FEATURE_MONITORING_SENTRY_ENABLED === "true") {
        requireKeys(
          values,
          ["VITE_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"],
          {
            requireValues: true,
          },
        );
        assertHttps(values, ["VITE_SENTRY_DSN"]);
      }
      if (values.VITE_FEATURE_ANALYTICS_POSTHOG_ENABLED === "true") {
        requireKeys(values, ["VITE_POSTHOG_KEY", "VITE_POSTHOG_HOST"], { requireValues: true });
      }
    }
  }

  if (source === "convex" || templateMode) {
    requireKeys(values, convexKeys, { requireValues: false });
    if (values.VITE_FEATURE_AUTH_PHONE_OTP_ENABLED === "true") {
      requireKeys(values, ["MSEGAT_USERNAME", "MSEGAT_API_KEY", "MSEGAT_SENDER"], {
        requireValues: false,
      });
    }
    if (!templateMode && options.file && !options["keys-only"]) {
      assertHttps(values, [
        "CONVEX_SITE_URL",
        "SITE_URL",
        "AUTH_EMAIL_OTP_WEBHOOK_URL",
        "SAKNAHA_EMAIL_WEBHOOK_URL",
        "SAKNAHA_APP_URL",
      ]);
    }
  }

  if (source === "ci") {
    requireKeys(values, ciKeys, { requireValues: true });
    assertHttps(values, ["APP_HEALTH_URL"]);
  }

  console.log(`Environment validation passed (${environment}/${source}).`);
}

main().catch((error) => {
  console.error(`Environment validation failed: ${error.message}`);
  process.exitCode = 1;
});
