"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Database } from "@/types/database";
import { nanoid } from "nanoid";
import ReceiptViewer from "@/components/ReceiptViewer";

type Registration = Database["public"]["Tables"]["registrations"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type Route = Database["public"]["Tables"]["routes"]["Row"];
type Parent = Database["public"]["Tables"]["parents"]["Row"];

interface RegistrationDetail extends Registration {
  student?: Student;
  route?: Route;
  parent?: Parent;
}

export default function RegistrationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const registrationId = params.id as string;

  const [registration, setRegistration] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    async function fetchRegistration() {
      try {
        const client = createClient();

        // Verify auth
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();

        if (userError || !user) throw new Error("Not authenticated");

        // Verify staff
        const { data: staffData, error: staffError } = await client
          .from("staff")
          .select("*")
          .eq("id", user.id)
          .single();

        if (staffError || !staffData) throw new Error("Access denied");

        // Fetch registration details
        const { data: regData, error: regError } = await client
          .from("registrations")
          .select(
            `
            *,
            student:students(*, parent:parents(*)),
            route:routes(*)
          `
          )
          .eq("id", registrationId)
          .single();

        if (regError) throw regError;

        const typedRegData = regData as unknown as RegistrationDetail;

        // Extract parent from nested structure
        if (typedRegData?.student) {
          const studentData = Array.isArray(typedRegData.student)
            ? typedRegData.student[0]
            : typedRegData.student;
          if (studentData?.parent) {
            const parentData = Array.isArray(studentData.parent)
              ? studentData.parent[0]
              : studentData.parent;
            if (parentData) {
              typedRegData.parent = parentData;
            }
          }
        }

        setRegistration(typedRegData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load registration");
        if (err instanceof Error && err.message.includes("Not authenticated")) {
          router.push("/accounts/login");
        }
      } finally {
        setLoading(false);
      }
    }

    if (registrationId) {
      fetchRegistration();
    }
  }, [registrationId, router]);

  const handleConfirm = async () => {
    if (!registration) return;

    setProcessing(true);
    try {
      const client = createClient();

      // Update registration status to confirmed
      const { error: updateError } = await client
        .from("registrations")
        .update({ status: "confirmed" })
        .eq("id", registration.id);

      if (updateError) throw updateError;

      // Create bus pass
      const qrToken = nanoid(32);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const { error: passError } = await client.from("bus_passes").insert({
        registration_id: registration.id,
        student_id: registration.student?.id,
        qr_token: qrToken,
        term: registration.term,
        valid_until: nextYear.toISOString().split("T")[0],
      });

      if (passError) throw passError;

      // Send confirmation email to parent
      // (using our stub email service)
      const parentEmail = registration.parent?.email || 
        (Array.isArray(registration.student) 
          ? registration.student[0]?.parent_id 
          : registration.student?.parent_id);
      
      if (parentEmail && typeof parentEmail === "string") {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parentEmail,
            subject: `Bus Pass Confirmed - ${registration.student?.full_name}`,
            html: `
              <p>Dear ${registration.parent?.full_name || "Parent"},</p>
              <p>The registration for ${registration.student?.full_name} has been confirmed!</p>
              <p>Your bus pass is now ready. Log in to your parent portal to view it.</p>
              <p>Reference Code: <strong>${registration.reference_code}</strong></p>
              <p>Best regards,<br/>BEKA Academy Transit Team</p>
            `,
          }),
        });
      }

      // Refresh and redirect
      router.push("/accounts/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!registration || !rejectionReason.trim()) {
      setError("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      const client = createClient();

      // Update registration status to rejected with reason
      const { error: updateError } = await client
        .from("registrations")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", registration.id);

      if (updateError) throw updateError;

      // Send rejection email to parent
      const parentEmail = registration.parent?.email;
      if (parentEmail && typeof parentEmail === "string") {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parentEmail,
            subject: `Registration Status - ${registration.student?.full_name}`,
            html: `
              <p>Dear ${registration.parent?.full_name || "Parent"},</p>
              <p>Unfortunately, the registration for ${registration.student?.full_name} could not be approved.</p>
              <p><strong>Reason:</strong> ${rejectionReason}</p>
              <p>Please contact the accounts office for more information.</p>
              <p>Reference Code: <strong>${registration.reference_code}</strong></p>
              <p>Best regards,<br/>BEKA Academy Transit Team</p>
            `,
          }),
        });
      }

      // Refresh and redirect
      router.push("/accounts/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Registration Not Found
            </h1>
            <p className="text-gray-600 mb-6">{error || "Unable to load registration"}</p>
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

  const student = Array.isArray(registration.student)
    ? registration.student[0]
    : registration.student;
  const route = Array.isArray(registration.route)
    ? registration.route[0]
    : registration.route;

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
  };

  const statusConfig = statusColors[registration.status as string] || statusColors.pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <a
            href="/accounts/dashboard"
            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Status Banner */}
        <div className={`${statusConfig.bg} rounded-2xl border-l-4 p-6 mb-8`}>
          <h1
            className={`text-2xl font-bold ${statusConfig.text} mb-1`}
          >
            {statusConfig.label}
          </h1>
          <p className={`text-sm ${statusConfig.text}`}>
            Reference: <span className="font-mono font-semibold">{registration.reference_code}</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-8">
          {/* Student Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Student Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">
                  Full Name
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {student?.full_name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">
                  Class Level
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {student?.class_level || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">
                  Route
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {route?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">
                  Trip Type
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {student?.trip_type === "one_way" ? "One Way" : "Round Trip"}
                </p>
              </div>
            </div>
          </div>

          {/* Parent Details */}
          {registration.parent && (
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Parent Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Full Name
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {registration.parent.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Email
                  </p>
                  <a
                    href={`mailto:${registration.parent.email}`}
                    className="text-base font-semibold text-purple-600 hover:text-purple-700"
                  >
                    {registration.parent.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Phone
                  </p>
                  <a
                    href={`tel:${registration.parent.phone}`}
                    className="text-base font-semibold text-purple-600 hover:text-purple-700"
                  >
                    {registration.parent.phone}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Address
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {registration.parent.address || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fare */}
          <div className="border-t border-gray-200 pt-8">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Computed Fare
              </p>
              <p className="text-3xl font-bold text-purple-600">
                ₦{registration.computed_fare.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Term: {registration.term}
              </p>
            </div>
          </div>

          {/* Payment Receipt */}
          {registration.status === "pending" && (
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                💳 Payment Receipt
              </h2>
              <ReceiptViewer proofUrl={registration.proof_of_payment_url} />
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {registration.status === "rejected" && registration.rejection_reason && (
            <div className="border-t border-gray-200 pt-8">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-xs text-red-700 uppercase tracking-wide font-semibold mb-2">
                  Rejection Reason
                </p>
                <p className="text-base text-red-700">
                  {registration.rejection_reason}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {registration.status === "pending" && (
            <div className="border-t border-gray-200 pt-8 space-y-4">
              {!showRejectForm ? (
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button
                    onClick={handleConfirm}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    {processing ? "Processing..." : "✓ Confirm Registration"}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    ✗ Reject Registration
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-red-900">Reject Registration</h3>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this registration is being rejected..."
                    className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={4}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }}
                      disabled={processing}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                      {processing ? "Processing..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
