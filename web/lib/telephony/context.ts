import type { RuntimeBusinessContext } from "@/lib/mcp/router";

export function getDefaultRuntimeContext(): RuntimeBusinessContext {
  const ordersRaw = process.env.RUNTIME_DEFAULT_ORDERS || "";
  const pricingRaw = process.env.RUNTIME_SERVICE_PRICING || "";

  const orders = ordersRaw
    ? ordersRaw.split(";").map((entry) => {
        const [orderId, status, eta] = entry.split(":");
        return {
          orderId: (orderId || "").trim(),
          status: (status || "pending").trim(),
          eta: (eta || "").trim() || undefined,
        };
      })
    : [];

  const servicePricing = pricingRaw
    ? pricingRaw
        .split(";")
        .map((entry) => {
          const [service, price] = entry.split(":");
          return {
            service: (service || "").trim(),
            price: (price || "").trim(),
          };
        })
        .filter((item) => item.service && item.price)
    : [
        { service: "Haircut", price: "199 INR" },
        { service: "Beard Trim", price: "99 INR" },
        { service: "Haircut + Beard", price: "249 INR" },
      ];

  return {
    knowledgeBaseId: process.env.RUNTIME_DEFAULT_KB_ID || "demo-barber",
    businessInfo: {
      name: process.env.RUNTIME_BUSINESS_NAME || "Ketan Barber Shop",
      openingHours: process.env.RUNTIME_OPENING_HOURS || "9 AM - 9 PM",
      address: process.env.RUNTIME_BUSINESS_ADDRESS || "Ahmedabad, Gujarat",
      servicePricing,
    },
    orders,
  };
}
