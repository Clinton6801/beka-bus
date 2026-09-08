"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Database } from "@/types/database";

type Route = Database["public"]["Tables"]["routes"]["Row"];
type DiscountTier = Database["public"]["Tables"]["discount_tiers"]["Row"];

type TabType = "routes" | "discounts";

interface RouteFormData {
  name: string;
  area_description: string;
  base_fare_one_way: number;
  base_fare_round_trip: number;
  active: boolean;
}

interface DiscountFormData {
  min_children: number;
  discount_percent: number;
  term: string;
  active: boolean;
}

export default function RoutesManagementPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [discounts, setDiscounts] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("routes");

  // Modal states
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DiscountTier | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form data
  const [routeForm, setRouteForm] = useState<RouteFormData>({
    name: "",
    area_description: "",
    base_fare_one_way: 0,
    base_fare_round_trip: 0,
    active: true,
  });

  const [discountForm, setDiscountForm] = useState<DiscountFormData>({
    min_children: 2,
    discount_percent: 10,
    term: "",
    active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const client = createClient();

      // Verify auth
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) throw new Error("Not authenticated");

      // Verify admin staff
      const { data: staffData, error: staffError } = await client
        .from("staff")
        .select("*")
        .eq("id", user.id)
        .single();

      if (staffError || !staffData || staffData.role !== "admin") {
        throw new Error("Access denied. Admin access required.");
      }

      // Fetch routes
      const { data: routesData, error: routesError } = await client
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });

      if (routesError) throw routesError;
      setRoutes(routesData || []);

      // Fetch discount tiers
      const { data: discountsData, error: discountsError } = await client
        .from("discount_tiers")
        .select("*")
        .order("min_children", { ascending: true });

      if (discountsError) throw discountsError;
      setDiscounts(discountsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        router.push("/accounts/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!routeForm.name.trim()) {
      setError("Route name is required");
      return;
    }

    setProcessing(true);
    try {
      const client = createClient();

      if (editingRoute) {
        // Update
        const { error: updateError } = await client
          .from("routes")
          .update(routeForm)
          .eq("id", editingRoute.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await client
          .from("routes")
          .insert(routeForm);

        if (insertError) throw insertError;
      }

      setShowRouteModal(false);
      setEditingRoute(null);
      setRouteForm({
        name: "",
        area_description: "",
        base_fare_one_way: 0,
        base_fare_round_trip: 0,
        active: true,
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (discountForm.min_children < 1) {
      setError("Min children must be at least 1");
      return;
    }

    setProcessing(true);
    try {
      const client = createClient();

      if (editingDiscount) {
        // Update
        const { error: updateError } = await client
          .from("discount_tiers")
          .update(discountForm)
          .eq("id", editingDiscount.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await client
          .from("discount_tiers")
          .insert(discountForm);

        if (insertError) throw insertError;
      }

      setShowDiscountModal(false);
      setEditingDiscount(null);
      setDiscountForm({
        min_children: 2,
        discount_percent: 10,
        term: "",
        active: true,
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save discount");
    } finally {
      setProcessing(false);
    }
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setRouteForm({
      name: route.name,
      area_description: route.area_description || "",
      base_fare_one_way: route.base_fare_one_way,
      base_fare_round_trip: route.base_fare_round_trip,
      active: route.active,
    });
    setShowRouteModal(true);
  };

  const handleEditDiscount = (discount: DiscountTier) => {
    setEditingDiscount(discount);
    setDiscountForm({
      min_children: discount.min_children,
      discount_percent: discount.discount_percent,
      term: discount.term || "",
      active: discount.active,
    });
    setShowDiscountModal(true);
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm("Delete this route?")) return;

    try {
      const client = createClient();
      const { error } = await client.from("routes").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm("Delete this discount tier?")) return;

    try {
      const client = createClient();
      const { error } = await client.from("discount_tiers").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete discount"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && error.includes("Access denied")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/accounts/dashboard"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Route & Discount Management
            </h1>
            <p className="text-gray-600 mt-1">Admin: Manage bus routes and discount tiers</p>
          </div>
          <a
            href="/accounts/dashboard"
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
          >
            Back
          </a>
        </div>
      </div>

      {/* Error Alert */}
      {error && !error.includes("Access denied") && (
        <div className="max-w-7xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(["routes", "discounts"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-purple-50 text-purple-600 border-b-2 border-purple-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab === "routes" ? "🚌 Routes" : "💰 Discounts"}
              </button>
            ))}
          </div>

          {/* Routes Tab */}
          {activeTab === "routes" && (
            <div className="p-6 space-y-6">
              <button
                onClick={() => {
                  setEditingRoute(null);
                  setRouteForm({
                    name: "",
                    area_description: "",
                    base_fare_one_way: 0,
                    base_fare_round_trip: 0,
                    active: true,
                  });
                  setShowRouteModal(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                + Add New Route
              </button>

              {routes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No routes yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Area
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          One Way
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Round Trip
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((route) => (
                        <tr
                          key={route.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {route.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {route.area_description || "—"}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            ₦{route.base_fare_one_way.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            ₦{route.base_fare_round_trip.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                route.active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-50 text-gray-700"
                              }`}
                            >
                              {route.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 space-x-2 text-sm">
                            <button
                              onClick={() => handleEditRoute(route)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(route.id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Discounts Tab */}
          {activeTab === "discounts" && (
            <div className="p-6 space-y-6">
              <button
                onClick={() => {
                  setEditingDiscount(null);
                  setDiscountForm({
                    min_children: 2,
                    discount_percent: 10,
                    term: "",
                    active: true,
                  });
                  setShowDiscountModal(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                + Add New Discount
              </button>

              {discounts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No discount tiers yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Min Children
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Discount %
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Term
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {discounts.map((discount) => (
                        <tr
                          key={discount.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {discount.min_children}
                          </td>
                          <td className="px-6 py-4 font-semibold text-purple-600">
                            {discount.discount_percent}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {discount.term || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                discount.active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-50 text-gray-700"
                              }`}
                            >
                              {discount.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 space-x-2 text-sm">
                            <button
                              onClick={() => handleEditDiscount(discount)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDiscount(discount.id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Route Modal */}
      {showRouteModal && (
        <RouteModal
          route={editingRoute}
          form={routeForm}
          setForm={setRouteForm}
          onSave={handleSaveRoute}
          onClose={() => setShowRouteModal(false)}
          processing={processing}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <DiscountModal
          discount={editingDiscount}
          form={discountForm}
          setForm={setDiscountForm}
          onSave={handleSaveDiscount}
          onClose={() => setShowDiscountModal(false)}
          processing={processing}
        />
      )}
    </div>
  );
}

interface RouteModalProps {
  route: Route | null;
  form: RouteFormData;
  setForm: (data: RouteFormData) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  processing: boolean;
}

function RouteModal({
  route,
  form,
  setForm,
  onSave,
  onClose,
  processing,
}: RouteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {route ? "Edit Route" : "New Route"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Route 1 — Uchenna"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area Description
            </label>
            <input
              type="text"
              value={form.area_description}
              onChange={(e) =>
                setForm({ ...form, area_description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Uchenna Bus Stop • Agbama • Isi Court"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                One Way Fare *
              </label>
              <input
                type="number"
                value={form.base_fare_one_way}
                onChange={(e) =>
                  setForm({
                    ...form,
                    base_fare_one_way: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="8000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Round Trip Fare *
              </label>
              <input
                type="number"
                value={form.base_fare_round_trip}
                onChange={(e) =>
                  setForm({
                    ...form,
                    base_fare_round_trip: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="15000"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="route_active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="route_active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={processing}
            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {processing ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DiscountModalProps {
  discount: DiscountTier | null;
  form: DiscountFormData;
  setForm: (data: DiscountFormData) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  processing: boolean;
}

function DiscountModal({
  discount,
  form,
  setForm,
  onSave,
  onClose,
  processing,
}: DiscountModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {discount ? "Edit Discount" : "New Discount"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Children *
            </label>
            <input
              type="number"
              min="1"
              value={form.min_children}
              onChange={(e) =>
                setForm({ ...form, min_children: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Percent *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.discount_percent}
              onChange={(e) =>
                setForm({ ...form, discount_percent: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Term (optional)
            </label>
            <input
              type="text"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., 2026 or Q1 2026"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="discount_active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="discount_active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={processing}
            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {processing ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
