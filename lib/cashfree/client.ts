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
  1: 100,
  2: 1000,
  3: 2000,
  4: 3000,
};

export function getTierAmount(tier: number): number {
  return TIER_PRICES[tier] ?? 0;
}
