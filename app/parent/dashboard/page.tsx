"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Database } from "@/types/database";
import ReceiptUpload from "@/components/ReceiptUpload";
import { paymentInfo } from "@/lib/paymentInfo";
import Link from "next/link";
import TransportationGuidelinesCard from "@/components/TransportationGuidelinesCard";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Registration = Database["public"]["Tables"]["registrations"]["Row"];
type Route = Database["public"]["Tables"]["routes"]["Row"];

interface StudentWithRegistration extends Student {
  registration?: (Registration & { route?: Route })[];
}

export default function ParentDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithRegistration[]>([]);
  const [parentId, setParentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentName, setParentName] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    try {
      const client = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) throw new Error("Not authenticated");

      // Fetch parent details
      const { data: parentData, error: parentError } = await client
        .from("parents")
        .select("*")
        .eq("id", user.id)
        .single();

      if (parentError) throw parentError;
      if (parentData) setParentName(parentData.full_name);

      // Store parent ID for use in StudentCard
      setParentId(user.id);

      // Fetch students with their registrations
      const { data: studentsData, error: studentsError } = await client
        .from("students")
        .select(
          `
          *,
          registration:registrations(*, route:routes(*))
        `
        )
        .eq("parent_id", user.id);

      if (studentsError) throw studentsError;
      setStudents((studentsData || []) as StudentWithRegistration[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      // Redirect to login on auth error
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        router.push("/parent/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router, refreshKey]);

  const handleLogout = async () => {
    const client = createClient();
    await client.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleReceiptUploadSuccess = () => {
    // Refresh the data after a short delay to ensure the database update is complete
    setTimeout(() => {
      setRefreshKey((prev) => prev + 1);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome, {parentName || "Parent"}
            </h1>
            <p className="text-gray-600 mt-1">
              View your children's registration status
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-5xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          {error}
        </div>
      )}

      {/* Guidelines Section */}
      <div className="max-w-5xl mx-auto mb-8">
        <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <summary className="cursor-pointer p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              📋 Transportation Guidelines
            </h2>
            <span className="text-gray-500">►</span>
          </summary>
          <div className="border-t border-gray-200 p-6">
            <TransportationGuidelinesCard />
          </div>
        </details>
      </div>

      {/* Children List */}
      <div className="max-w-5xl mx-auto">
        {students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">👨‍👩‍👧</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No children registered yet
            </h2>
            <p className="text-gray-600 mb-6">
              Get started by registering your first child
            </p>
            <a
              href="/register"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              Register a Child
            </a>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {students.map((student) => (
              <StudentCard 
                key={student.id} 
                student={student} 
                parentId={parentId} 
                onReceiptUploadSuccess={handleReceiptUploadSuccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StudentCardProps {
  student: StudentWithRegistration;
  parentId: string;
  onReceiptUploadSuccess: () => void;
}

function StudentCard({ student, parentId, onReceiptUploadSuccess }: StudentCardProps) {
  const registration = Array.isArray(student.registration)
    ? student.registration[0]
    : student.registration;
  const route = registration?.route;

  const statusColors: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    pending: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      label: "Pending Review",
    },
    confirmed: { bg: "bg-green-50", text: "text-green-700", label: "Confirmed" },
    rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
    expired: { bg: "bg-gray-50", text: "text-gray-700", label: "Expired" },
  };

  const status = (registration?.status as string) || "pending";
  const statusConfig = statusColors[status] || statusColors["pending"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div className={`${statusConfig.bg} p-6 border-b border-gray-200`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              {student.full_name}
            </h3>
            <p className="text-sm text-gray-600">Class {student.class_level}</p>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${statusConfig.text} ${statusConfig.bg} border border-current border-opacity-20`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4">
        {/* Route & Trip Type */}
        {route && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide">
                Route
              </p>
              <p className="text-sm font-semibold text-gray-900">{route.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide">
                Trip Type
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {student.trip_type === "one_way" ? "One Way" : "Round Trip"}
              </p>
            </div>
          </div>
        )}

        {/* Fare */}
        {registration && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Total Fare
            </p>
            <p className="text-2xl font-bold text-purple-600">
              ₦{registration.computed_fare.toLocaleString()}
            </p>
          </div>
        )}

        {/* Action Button */}
        {registration?.status === "confirmed" && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
            <p className="text-sm font-semibold text-green-700">
              ✓ Registration confirmed — your child is cleared for bus service this term
            </p>
          </div>
        )}

        {registration?.status === "pending" && (
          <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
            {/* Payment Instructions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                💳 Payment Instructions
              </h4>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Bank Name
                  </p>
                  <p className="font-semibold text-gray-900">
                    {paymentInfo.bankName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Account Name
                  </p>
                  <p className="font-semibold text-gray-900">
                    {paymentInfo.accountName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Account Number
                  </p>
                  <p className="font-mono font-bold text-gray-900">
                    {paymentInfo.accountNumber}
                  </p>
                </div>
                <div className="bg-white rounded p-3 mt-3 border border-blue-100">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Amount to Pay
                  </p>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    ₦{registration.computed_fare.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Reference: <span className="font-mono font-bold">{registration.reference_code}</span>
                  </p>
                </div>
                <p className="text-xs text-blue-700 italic">
                  📌 {paymentInfo.paymentNote}
                </p>
              </div>
            </div>

            {/* Receipt Upload */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                📄 Payment Proof
              </h4>
              <ReceiptUpload
                parentId={parentId}
                registrationId={registration.id}
                referenceCode={registration.reference_code}
                existingPath={registration.proof_of_payment_url}
                onUploadSuccess={onReceiptUploadSuccess}
              />
            </div>
          </div>
        )}

        {registration?.status === "rejected" && (
          <p className="text-xs text-red-700 bg-red-50 rounded-lg p-3 border border-red-200">
            ✗ This registration was not approved. Please contact the accounts
            office for more information.
          </p>
        )}
      </div>
    </div>
  );
}
