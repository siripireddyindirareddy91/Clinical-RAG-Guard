import { describe, it, expect, vi, afterEach } from "vitest";
import { api, percent } from "./api";
describe("API boundary", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("formats system estimates", () => expect(percent(0.875)).toBe("88%"));
  it("surfaces server failures instead of returning success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          json: async () => ({ detail: "Evidence unavailable" }),
        }),
    );
    await expect(api("/clinical/query")).rejects.toThrow(
      "Evidence unavailable",
    );
  });
  it("preserves authenticated requests", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: "healthy" }),
      });
    vi.stubGlobal("fetch", fetcher);
    await expect(api("/health")).resolves.toEqual({ status: "healthy" });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
