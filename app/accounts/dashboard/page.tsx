"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Database } from "@/types/database";
import Link from "next/link";

type Registration = Database["public"]["Tables"]["registrations"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type Route = Database["public"]["Tables"]["routes"]["Row"];
type Parent = Database["public"]["Tables"]["parents"]["Row"];

interface RegistrationWithDetails extends Registration {
  student?: Student;
  route?: Route;
  parent?: Parent;
}

type StatusFilter = "all" | "pending" | "confirmed" | "rejected";

export default function AccountsDashboard() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  useEffect(() => {
    async function checkAuthAndFetchData() {
      try {
        const client = createClient();

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();

        if (userError || !user) {
          setAuthChecked(true);
          setIsAuthorized(false);
          router.push("/accounts/login");
          return;
        }

        // Verify user is staff
        const { data: staffData, error: staffError } = await client
          .from("staff")
          .select("*")
          .eq("id", user.id)
          .single();

        if (staffError || !staffData) {
          setAuthChecked(true);
          setIsAuthorized(false);
          setError("Access denied. Staff account not found.");
          return;
        }

        setIsAuthorized(true);
        setAuthChecked(true);

        // Fetch registrations with related data
        let query = client
          .from("registrations")
          .select(
            `
            *,
            student:students(*, parent:parents(*))
          `
          )
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        const { data: regData, error: regError } = await query;

        if (regError) throw regError;
        setRegistrations((regData || []) as unknown as RegistrationWithDetails[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetchData();
  }, [statusFilter, router]);

  const handleLogout = async () => {
    const client = createClient();
    await client.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Registration Management
              </h1>
              <p className="text-gray-600 mt-1">
                Review and process student registrations
              </p>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <a
                href="/accounts/verify"
                className="px-6 py-2.5 border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-lg transition-colors text-sm"
              >
                🔍 Verify Passes
              </a>
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Filter by Status</h3>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { value: "pending", label: "Pending", color: "yellow" },
                { value: "confirmed", label: "Confirmed", color: "green" },
                { value: "rejected", label: "Rejected", color: "red" },
                { value: "all", label: "All", color: "gray" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value as StatusFilter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? filter.color === "yellow"
                      ? "bg-yellow-600 text-white"
                      : filter.color === "green"
                        ? "bg-green-600 text-white"
                        : filter.color === "red"
                          ? "bg-red-600 text-white"
                          : "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="max-w-7xl mx-auto">
        {registrations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No registrations found
            </h2>
            <p className="text-gray-600">
              There are no {statusFilter !== "all" ? statusFilter : ""} registrations at this time.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Reference Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Student Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Route
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Fare
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, index) => {
                    const student = Array.isArray(reg.student)
                      ? reg.student[0]
                      : reg.student;
                    const route = Array.isArray(reg.route)
                      ? reg.route[0]
                      : reg.route;

                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-50 text-yellow-700",
                      confirmed: "bg-green-50 text-green-700",
                      rejected: "bg-red-50 text-red-700",
                    };

                    return (
                      <tr
                        key={reg.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-mono font-semibold text-purple-600">
                          {reg.reference_code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {student?.full_name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {route?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₦{reg.computed_fare.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              statusColors[reg.status as string] || statusColors.pending
                            }`}
                          >
                            {reg.status}
                          </span>
                          {reg.status === "pending" && !reg.proof_of_payment_url && (
                            <span className="inline-block ml-2 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold border border-yellow-200">
                              ⚠️ No receipt
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(reg.created_at).toLocaleDateString("en-NG")}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/accounts/dashboard/${reg.id}`}
                            className="inline-block px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded transition-colors"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
