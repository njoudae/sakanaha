import { describe, expect, it } from "vitest";
import { assertSecureProviderEndpoint } from "./providerSecurity";

describe("provider endpoint security", () => {
  it("accepts public HTTPS endpoints without rewriting them", () => {
    const endpoint = "https://provider.example.test/v1/send?region=sa";
    expect(assertSecureProviderEndpoint(endpoint)).toBe(endpoint);
  });

  it.each([
    "http://provider.example.test/send",
    "https://localhost/send",
    "https://127.0.0.1/send",
    "https://169.254.169.254/latest/meta-data",
    "https://10.0.0.8/send",
    "https://172.16.0.8/send",
    "https://192.168.1.8/send",
    "https://[::1]/send",
    "https://[fd00::1]/send",
    "https://service.internal/send",
    "https://user:password@provider.example.test/send",
  ])("rejects unsafe endpoint %s", (endpoint) => {
    expect(() => assertSecureProviderEndpoint(endpoint)).toThrow();
  });
});
