import { describe, expect, it } from "vitest";

import { setPgPoolForTests, withPgTransaction } from "../transaction.js";

describe("withPgTransaction", () => {
  it("uses the injected pool in tests", async () => {
    const calls: string[] = [];

    const fakeClient = {
      query: async (sql: string) => {
        calls.push(sql.toLowerCase());
        return { rows: [] };
      },
      release: () => {},
    };

    const fakePool = {
      connect: async () => fakeClient,
    };

    setPgPoolForTests(fakePool as unknown as import("pg").Pool);

    const result = await withPgTransaction(async () => {
      return 123;
    });

    setPgPoolForTests(null);

    expect(result).toBe(123);
    expect(calls).toEqual(["begin", "commit"]);
  });
});
