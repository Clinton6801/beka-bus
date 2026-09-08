// Shared fare calculation logic — used by both the public calculator (client-side
// estimate) and the server-side registration handler (authoritative calculation).
// NEVER trust a fare amount submitted from the client; always recompute server-side.

export type TripType = "one_way" | "round_trip";

export interface RouteFare {
  base_fare_one_way: number;
  base_fare_round_trip: number;
}

export interface DiscountTier {
  min_children: number;
  discount_percent: number;
}

/**
 * Calculate total fare for a set of children on possibly different routes/trip types.
 * Discount tier is applied based on total children count in the registration batch.
 */
export function calculateFare(
  children: { route: RouteFare; tripType: TripType }[],
  discountTiers: DiscountTier[]
): { perChild: number[]; subtotal: number; discountPercent: number; total: number } {
  const perChild = children.map((c) =>
    c.tripType === "one_way" ? c.route.base_fare_one_way : c.route.base_fare_round_trip
  );

  const subtotal = perChild.reduce((sum, f) => sum + f, 0);

  // Pick the highest-qualifying discount tier for this many children
  const applicableTier = discountTiers
    .filter((t) => children.length >= t.min_children)
    .sort((a, b) => b.discount_percent - a.discount_percent)[0];

  const discountPercent = applicableTier?.discount_percent ?? 0;
  const total = Math.round(subtotal * (1 - discountPercent / 100));

  return { perChild, subtotal, discountPercent, total };
}

/** Generate a human-friendly, unique-ish reference code for a registration. */
export function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BEKA-${year}-${rand}`;
}
