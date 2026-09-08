"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateFare, type RouteFare, type DiscountTier } from "@/lib/fare";
import { Database } from "@/types/database";

type Route = Database["public"]["Tables"]["routes"]["Row"];

export default function FareCalculator() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [numChildren, setNumChildren] = useState(1);
  const [tripType, setTripType] = useState<"one_way" | "round_trip">("round_trip");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Calculated state
  const [calculation, setCalculation] = useState<ReturnType<typeof calculateFare> | null>(null);

  // Fetch routes and discount tiers
  useEffect(() => {
    async function fetchData() {
      try {
        const client = createClient();

        const [routesRes, tiersRes] = await Promise.all([
          client.from("routes").select("*").eq("active", true),
          client.from("discount_tiers").select("*").eq("active", true),
        ]);

        if (routesRes.error) throw routesRes.error;
        if (tiersRes.error) throw tiersRes.error;

        setRoutes(routesRes.data || []);
        setDiscountTiers(
          (tiersRes.data || []).map((tier) => ({
            min_children: tier.min_children,
            discount_percent: tier.discount_percent,
          }))
        );

        // Set first route as default
        if (routesRes.data && routesRes.data.length > 0) {
          setSelectedRoute(routesRes.data[0].id);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load routes. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate fare when inputs change
  useEffect(() => {
    if (!selectedRoute || routes.length === 0) {
      setCalculation(null);
      return;
    }

    const route = routes.find((r) => r.id === selectedRoute);
    if (!route) return;

    const children = Array(numChildren).fill(null).map(() => ({
      route: {
        base_fare_one_way: route.base_fare_one_way,
        base_fare_round_trip: route.base_fare_round_trip,
      } as RouteFare,
      tripType,
    }));

    const result = calculateFare(children, discountTiers);
    setCalculation(result);
  }, [selectedRoute, numChildren, tripType, routes, discountTiers]);

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
        <p className="font-semibold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-8 sm:p-10 border border-gray-200">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Calculate Bus Fare
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Select your route and number of children to preview exact term pricing with multi-child discounts.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Route Selection */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            01 / Location & Bus Route
          </label>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors flex items-center justify-between"
            >
              <span className={selectedRoute ? "text-gray-900 font-medium" : "text-gray-500"}>
                {selectedRouteData
                  ? selectedRouteData.name
                  : "Select your residential neighborhood or route..."}
              </span>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Dropdown List */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => {
                      setSelectedRoute(route.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <p className="font-semibold text-gray-900">{route.name}</p>
                    {route.area_description && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {route.area_description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Number of Children */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            02 / Number of Children
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNumChildren(Math.max(1, numChildren - 1))}
              className="w-12 h-12 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-colors text-lg font-semibold text-gray-700"
            >
              −
            </button>
            <div className="flex-1 px-4 py-3 sm:py-4 bg-white border border-gray-300 rounded-lg text-center font-semibold text-lg text-gray-900">
              {numChildren}
            </div>
            <button
              onClick={() => setNumChildren(Math.min(10, numChildren + 1))}
              className="w-12 h-12 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-colors text-lg font-semibold text-gray-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Step 3: Trip Type */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            03 / Trip Type
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTripType("round_trip")}
              className={`flex-1 px-4 py-3 sm:py-4 rounded-lg font-semibold transition-colors ${
                tripType === "round_trip"
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
              }`}
            >
              Round Trip
            </button>
            <button
              onClick={() => setTripType("one_way")}
              className={`flex-1 px-4 py-3 sm:py-4 rounded-lg font-semibold transition-colors ${
                tripType === "one_way"
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
              }`}
            >
              One Way
            </button>
          </div>
        </div>

        {/* Fare Estimate Display */}
        {calculation && selectedRouteData && (
          <div className="bg-white rounded-lg p-6 sm:p-8 border border-gray-200 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600 text-sm">Base fare per child</span>
              <span className="font-semibold text-gray-900">
                ₦{(
                  tripType === "one_way"
                    ? selectedRouteData.base_fare_one_way
                    : selectedRouteData.base_fare_round_trip
                ).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600 text-sm">Subtotal ({numChildren} children)</span>
              <span className="font-semibold text-gray-900">
                ₦{calculation.subtotal.toLocaleString()}
              </span>
            </div>

            {calculation.discountPercent > 0 && (
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-green-600 text-sm font-medium">
                  Discount ({calculation.discountPercent}%)
                </span>
                <span className="font-semibold text-green-600">
                  −₦{(calculation.subtotal - calculation.total).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-900 font-bold">Total Fare</span>
              <span className="text-3xl font-bold text-purple-600">
                ₦{calculation.total.toLocaleString()}
              </span>
            </div>

            {calculation.discountPercent > 0 && (
              <p className="text-xs text-green-700 bg-green-50 rounded p-3 mt-4">
                🎉 You qualify for a {calculation.discountPercent}% discount for {numChildren}{" "}
                child{numChildren > 1 ? "ren" : ""}!
              </p>
            )}
          </div>
        )}

        {/* CTA Button */}
        <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 sm:py-4 rounded-lg transition-colors text-base sm:text-lg">
          Calculate Fare Estimate
        </button>
      </div>
    </div>
  );
}

