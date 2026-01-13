import assert from "node:assert/strict";
import test from "node:test";
import { createJobSourceRouter } from "./router";

test("falls back to second provider when first fails", async () => {
  const router = createJobSourceRouter({
    providers: [
      {
        id: "primary",
        platforms: ["upwork"],
        async search() {
          throw new Error("boom");
        },
      },
      {
        id: "fallback",
        platforms: ["upwork"],
        async search() {
          return [
            {
              platform: "upwork",
              provider: "fallback",
              fetchedAt: new Date().toISOString(),
              raw: { ok: true },
              title: "Test job",
            },
          ];
        },
      },
    ],
    providerPriority: { upwork: ["primary", "fallback"] },
    timeoutMs: 5_000,
    maxAttempts: 1,
  });

  const results = await router.search("upwork", { keywords: ["typescript"] });
  assert.equal(results.length, 1);
  assert.equal(results[0]?.provider, "fallback");
  assert.equal(results[0]?.platform, "upwork");
});

