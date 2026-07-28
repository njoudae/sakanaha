import { describe, expect, it, vi } from "vitest";
import type { IdentityProviderAdapter, IdentitySession } from "./IdentityProviderAdapter";
import { IdentitySessionController } from "./IdentitySessionController";

const activeSession: IdentitySession = {
  identity: { identityKey: "opaque-platform-identity-001" },
  expiresAt: 2_000,
  refreshExpiresAt: 4_000,
};

function adapter(overrides: Partial<IdentityProviderAdapter> = {}): IdentityProviderAdapter {
  return {
    signIn: vi.fn(async () => activeSession),
    signOut: vi.fn(async () => undefined),
    getCurrentIdentity: vi.fn(async () => activeSession.identity),
    refreshSession: vi.fn(async () => activeSession),
    validateSession: vi.fn(async () => activeSession),
    ...overrides,
  };
}

describe("IdentitySessionController", () => {
  it("validates and exposes an active canonical identity", async () => {
    const controller = new IdentitySessionController(adapter(), () => 1_000);
    expect(await controller.initialize()).toEqual({
      status: "authenticated",
      session: activeSession,
    });
    expect(await controller.currentIdentity()).toEqual(activeSession.identity);
  });

  it("rejects expired sessions and refreshes through the adapter boundary", async () => {
    const provider = adapter({
      validateSession: vi.fn(async () => ({ ...activeSession, expiresAt: 900 })),
    });
    const controller = new IdentitySessionController(provider, () => 1_000);
    expect(await controller.initialize()).toEqual({ status: "expired", session: null });
    expect(await controller.refresh()).toEqual({
      status: "authenticated",
      session: activeSession,
    });
  });

  it("clears local state even when provider logout fails", async () => {
    const controller = new IdentitySessionController(
      adapter({ signOut: vi.fn(async () => Promise.reject(new Error("remote failure"))) }),
      () => 1_000,
    );
    await controller.initialize();
    await expect(controller.signOut()).rejects.toThrow("remote failure");
    expect(controller.currentState()).toEqual({ status: "anonymous", session: null });
  });
});
