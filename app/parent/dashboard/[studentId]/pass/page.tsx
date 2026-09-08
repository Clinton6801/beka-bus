"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Database } from "@/types/database";
import { QRCodeSVG } from "qrcode.react";

type BusPass = Database["public"]["Tables"]["bus_passes"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type Route = Database["public"]["Tables"]["routes"]["Row"];
type Registration = Database["public"]["Tables"]["registrations"]["Row"];

interface BusPassWithDetails extends Omit<BusPass, "student_id"> {
  student?: Student | null;
  route?: Route;
}

export default function BusPassPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;
  const qrRef = useRef<any>(null);

  const [busPass, setBusPass] = useState<BusPassWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchBusPass() {
      try {
        const client = createClient();

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();

        if (userError || !user) throw new Error("Not authenticated");

        // Fetch bus pass with student and route details
        const { data: passData, error: passError } = await client
          .from("bus_passes")
          .select(
            `
            *,
            student:students(*),
            registration:registrations(route:routes(*))
          `
          )
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (passError) throw new Error("Bus pass not found");
        if (!passData) throw new Error("No active bus pass");

        // Verify ownership (check that the student belongs to this parent)
        const { data: studentData, error: studentError } = await client
          .from("students")
          .select("parent_id")
          .eq("id", studentId)
          .single();

        if (studentError || studentData?.parent_id !== user.id) {
          throw new Error("Unauthorized");
        }

        // Extract route from nested structure
        const registration = Array.isArray(passData.registration)
          ? passData.registration[0]
          : passData.registration;

        const busPassWithDetails: BusPassWithDetails = {
          ...passData,
          route: registration?.route,
        };

        setBusPass(busPassWithDetails);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bus pass");
        if (
          err instanceof Error &&
          err.message.includes("Not authenticated")
        ) {
          router.push("/parent/login");
        }
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      fetchBusPass();
    }
  }, [studentId, router]);

  const handleDownload = async () => {
    if (!qrRef.current) return;

    setDownloading(true);
    try {
      const svg = qrRef.current.querySelector("svg");
      if (!svg) throw new Error("QR code not found");

      // Convert SVG to PNG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const svgString = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `bus-pass-${busPass?.student?.full_name || "pass"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloading(false);
      };
      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgString)));
    } catch (err) {
      console.error("Download failed:", err);
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading your bus pass...</p>
        </div>
      </div>
    );
  }

  if (error || !busPass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Bus Pass Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              {error || "Unable to load bus pass"}
            </p>
            <a
              href="/parent/dashboard"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isValid = new Date(busPass.valid_until) >= new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/parent/dashboard"
            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Main Pass Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
          {/* Validity Banner */}
          <div
            className={`${
              isValid
                ? "bg-green-50 border-b border-green-200"
                : "bg-red-50 border-b border-red-200"
            } p-4 text-center`}
          >
            <p
              className={`text-sm font-semibold ${
                isValid ? "text-green-700" : "text-red-700"
              }`}
            >
              {isValid ? "✓ Pass is Active" : "✗ Pass has Expired"}
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Student Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {busPass.student?.full_name}
              </h1>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Route
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {busPass.route?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Term
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {busPass.term}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div
                ref={qrRef}
                className="bg-white p-6 rounded-xl border-4 border-purple-200"
              >
                <QRCodeSVG
                  value={busPass.qr_token}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-600 font-mono text-center break-all">
                {busPass.qr_token}
              </p>
            </div>

            {/* Validity Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Valid From
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(busPass.issued_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    Valid Until
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      isValid ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {new Date(busPass.valid_until).toLocaleDateString("en-NG")}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-blue-700 text-sm space-y-2">
              <p className="font-semibold">📱 How to use your bus pass:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Present this QR code to the bus conductor</li>
                <li>They will scan it to verify your pass</li>
                <li>You can take a screenshot or download as an image</li>
                <li>Your pass is valid from the dates shown above</li>
              </ul>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {downloading ? "Downloading..." : "📥 Download as Image"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help? Contact the accounts office</p>
        </div>
      </div>
    </div>
  );
}
