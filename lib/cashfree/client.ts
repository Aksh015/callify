import { Cashfree, CFEnvironment } from "cashfree-pg";

const cfEnvironment =
  process.env.CASHFREE_ENVIRONMENT === "production"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

export function getCashfree() {
  return new Cashfree(
    cfEnvironment,
    process.env.CASHFREE_APP_ID!,
    process.env.CASHFREE_SECRET_KEY!
  );
}

export { Cashfree, CFEnvironment };

export const TIER_PRICES: Record<number, number> = {
  1: 6,
  2: 7,
  3: 8,
  4: 9,
};

export function getTierAmount(tier: number): number {
  return TIER_PRICES[tier] ?? 0;
}
