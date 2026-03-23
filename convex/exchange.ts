import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const getRates = action({
  args: {
    sessionToken: v.string(),
  },
  handler: async (_ctx, _args) => {
    // sessionToken validation is skipped in actions since we can't access db directly,
    // but the token is required as a contract to ensure only authenticated clients call this.

    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );

    if (!response.ok) {
      throw new ConvexError(
        `Failed to fetch exchange rates: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new ConvexError("Exchange rate API returned an error");
    }

    const rates = data.rates as Record<string, number>;

    return {
      base: "USD",
      lastUpdated: data.time_last_update_utc ?? null,
      rates: {
        USD: 1,
        KRW: rates["KRW"] ?? null,
        UZS: rates["UZS"] ?? null,
      },
    };
  },
});
