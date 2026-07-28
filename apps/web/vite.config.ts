import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sentryUploadEnabled = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT && env.VITE_APP_RELEASE,
  );
  return {
    plugins: [
      react(),
      sentryUploadEnabled
        ? sentryVitePlugin({
            authToken: env.SENTRY_AUTH_TOKEN,
            org: env.SENTRY_ORG,
            project: env.SENTRY_PROJECT,
            release: { name: env.VITE_APP_RELEASE },
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
            telemetry: false,
          })
        : null,
    ],
    build: {
      cssCodeSplit: true,
      sourcemap: sentryUploadEnabled ? "hidden" : false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("@sentry/")) return "vendor-monitoring";
            if (id.includes("posthog-js") || id.includes("@posthog/")) return "vendor-analytics";
            if (id.includes("leaflet")) return "vendor-maps";
            if (id.includes("@convex-dev/") || id.includes("convex/")) return "vendor-convex";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("react/") || id.includes("react-dom/") || id.includes("scheduler/")) {
              return "vendor-react";
            }
            return undefined;
          },
        },
      },
    },
  };
});
