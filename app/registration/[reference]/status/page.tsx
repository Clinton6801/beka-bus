"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Registration = Database["public"]["Tables"]["registrations"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type Route = Database["public"]["Tables"]["routes"]["Row"];

interface RegistrationWithDetails extends Registration {
  student?: Student;
  route?: Route;
}

export default function StatusPage() {
  const params = useParams();
  const referenceCode = params.reference as string;

  const [registration, setRegistration] =
    useState<RegistrationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRegistration() {
      try {
        const client = createClient();

        const { data, error: fetchError } = await client
          .from("registrations")
          .select(
            `
            *,
            student:students(*),
            route:routes(*)
          `
          )
          .eq("reference_code", referenceCode)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Registration not found");

        setRegistration(data as RegistrationWithDetails);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch registration status"
        );
      } finally {
        setLoading(false);
      }
    }

    if (referenceCode) {
      fetchRegistration();
    }
  }, [referenceCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading your registration status...</p>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <a
              href="/"
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              ← Back to Home
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Registration Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              {error ||
                "We couldn't find a registration with that reference code."}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Make sure you entered the correct reference code (e.g.,
                BEKA-2026-1234)
              </p>
              <a
                href="/"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    pending: { bg: "bg-yellow-50", text: "text-yellow-700", icon: "⏳" },
    confirmed: { bg: "bg-green-50", text: "text-green-700", icon: "✓" },
    rejected: { bg: "bg-red-50", text: "text-red-700", icon: "✗" },
    expired: { bg: "bg-gray-50", text: "text-gray-700", icon: "⊗" },
  };

  const statusConfig =
    statusColors[registration.status as string] ||
    statusColors["pending"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            ← Back to Home
          </a>
        </div>

        <div className={`${statusConfig.bg} border-l-4 rounded-2xl p-8 mb-8`}>
          <div className="flex items-start gap-4">
            <div className="text-4xl">{statusConfig.icon}</div>
            <div>
              <h1 className={`text-2xl font-bold ${statusConfig.text} mb-2`}>
                {registration.status === "pending"
                  ? "Pending Review"
                  : registration.status === "confirmed"
                    ? "Confirmed"
                    : registration.status === "rejected"
                      ? "Rejected"
                      : "Expired"}
              </h1>
              <p className={`text-sm ${statusConfig.text}`}>
                {registration.status === "pending"
                  ? "Your registration is being reviewed by our accounts office."
                  : registration.status === "confirmed"
                    ? "Your registration is confirmed! Your bus pass is ready."
                    : registration.status === "rejected"
                      ? "Unfortunately, your registration was not approved."
                      : "This registration has expired."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Reference Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Code
            </label>
            <div className="bg-gray-50 p-4 rounded-lg font-mono font-bold text-lg text-center border border-gray-200">
              {registration.reference_code}
            </div>
          </div>

          {/* Student Details */}
          {registration.student && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Student Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Student Name</p>
                  <p className="font-medium text-gray-900">
                    {registration.student.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class Level</p>
                  <p className="font-medium text-gray-900">
                    {registration.student.class_level}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Route & Fare */}
          {registration.route && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Transportation Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Route</p>
                  <p className="font-medium text-gray-900">
                    {registration.route.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trip Type</p>
                  <p className="font-medium text-gray-900">
                    {registration.student?.trip_type === "one_way"
                      ? "One Way"
                      : "Round Trip"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fare */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fare</h2>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Total Fare</p>
              <p className="text-3xl font-bold text-purple-600">
                ₦{registration.computed_fare.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Rejection Reason */}
          {registration.status === "rejected" && registration.rejection_reason && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Rejection Reason
              </h2>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
                {registration.rejection_reason}
              </div>
            </div>
          )}

          {/* Submission Date */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              Submitted:{" "}
              {new Date(registration.created_at).toLocaleDateString("en-NG", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
