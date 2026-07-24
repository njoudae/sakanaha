const privateIpv4Patterns = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
];

export function assertSecureProviderEndpoint(value: string, label = "Provider endpoint") {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  if (url.username || url.password) throw new Error(`${label} must not contain credentials.`);
  if (url.hash) throw new Error(`${label} must not contain a URL fragment.`);
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::" ||
    hostname === "::1" ||
    hostname.includes(":") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    privateIpv4Patterns.some((pattern) => pattern.test(hostname))
  ) {
    throw new Error(`${label} must not target a local or private network address.`);
  }
  return value;
}
