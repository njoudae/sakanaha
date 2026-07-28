#!/usr/bin/env node
const options = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, item, index, values) => {
    if (item.startsWith("--")) pairs.push([item.slice(2), values[index + 1]]);
    return pairs;
  }, []),
);

function safeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Health URL must use HTTPS outside local development.");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function request(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers: { "user-agent": "saknaha-deployment-health/1.0" },
      });
      if (response.ok) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }
  throw lastError;
}

async function main() {
  if (!options.url) throw new Error("--url is required.");
  const base = safeBaseUrl(options.url);
  const home = await request(base);
  const html = await home.text();
  if (!html.includes('id="root"')) throw new Error("Home response is not the Saknaha SPA shell.");
  for (const header of [
    "content-security-policy",
    "referrer-policy",
    "x-content-type-options",
    "x-frame-options",
    "permissions-policy",
  ]) {
    if (!home.headers.get(header)) throw new Error(`Deployment is missing ${header}.`);
  }

  const entry = html.match(/(?:src|href)="\/assets\/([^"?]+\.js)"/)?.[1];
  if (!entry) throw new Error("Unable to locate the deployed entry chunk.");
  const asset = await request(new URL(`/assets/${entry}`, base));
  if (!asset.headers.get("cache-control")?.includes("immutable")) {
    throw new Error("Hashed asset is missing immutable caching.");
  }
  const spaRoute = await request(new URL("/housing", base));
  if (!(await spaRoute.text()).includes('id="root"')) {
    throw new Error("SPA route fallback validation failed.");
  }
  console.log(`Deployment health verification passed for ${base.origin}.`);
}

main().catch((error) => {
  console.error(`Deployment health verification failed: ${error.message}`);
  process.exitCode = 1;
});
