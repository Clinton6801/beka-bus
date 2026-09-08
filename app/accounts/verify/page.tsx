"use client";

import { useState } from "react";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import QRScanner to avoid SSR issues
const QRScanner = dynamic(() => import("@/components/QRScanner"), {
  ssr: false,
  loading: () => <div className="text-gray-600 text-sm">Loading camera...</div>,
});

interface VerificationResult {
  valid: boolean;
  student_name?: string;
  route?: string;
  term?: string;
  valid_until?: string;
  message?: string;
  error?: string;
}

export default function PassVerificationPage() {
  const router = useRouter();
  const [qrToken, setQrToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const client = createClient();
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

        if (staffError || !staffData) {
          throw new Error("Staff access required");
        }
      } catch (err) {
        router.push("/accounts/login");
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!qrToken.trim()) {
        setError("Please enter a QR token");
        return;
      }

      const response = await fetch("/api/pass/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: qrToken.trim() }),
      });

      const data: VerificationResult = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        setResult(null);
      } else {
        setResult(data);
        setQrToken(""); // Clear input on success
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              QR Pass Verification
            </h1>
            <p className="text-gray-600 mt-1">
              Scan or enter QR codes to verify bus passes at the gate
            </p>
          </div>
          <a
            href="/accounts/dashboard"
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          {/* Input Section */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Token / Pass Code
              </label>
              <input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Paste QR code or enter token..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-gray-600 mt-2">
                Scan QR code with device camera or paste the token manually
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Verifying..." : "🔍 Verify Pass"}
            </button>
            <button
              type="button"
              onClick={() => setShowScanner(!showScanner)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {showScanner ? "📝 Manual Entry" : "📷 Use Camera"}
            </button>
          </form>

          {/* QR Scanner */}
          {showScanner && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                📷 Scan QR Code
              </h3>
              <QRScanner
                onScan={(token) => {
                  setQrToken(token);
                  setShowScanner(false);
                }}
                onError={(err) => setError(err)}
              />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">❌ Verification Failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Success State */}
          {result?.valid && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-2xl font-bold text-green-700 mb-1">
                  {result.student_name}
                </p>
                <p className="text-green-600 font-semibold">{result.message}</p>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3 border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Route:</span>
                  <span className="font-semibold text-gray-900">
                    {result.route || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Term:</span>
                  <span className="font-semibold text-gray-900">
                    {result.term || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valid Until:</span>
                  <span className="font-semibold text-gray-900">
                    {result.valid_until
                      ? new Date(result.valid_until).toLocaleDateString("en-NG")
                      : "N/A"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setResult(null);
                  setQrToken("");
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Verify Another Pass
              </button>
            </div>
          )}

          {/* Expired State */}
          {result && !result.valid && !error && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <p className="text-4xl mb-3">⏰</p>
                <p className="text-2xl font-bold text-yellow-700 mb-1">
                  {result.student_name}
                </p>
                <p className="text-yellow-600 font-semibold">{result.message}</p>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3 border border-yellow-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Route:</span>
                  <span className="font-semibold text-gray-900">
                    {result.route || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Term:</span>
                  <span className="font-semibold text-gray-900">
                    {result.term || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expired On:</span>
                  <span className="font-semibold text-yellow-700">
                    {result.valid_until
                      ? new Date(result.valid_until).toLocaleDateString("en-NG")
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-700">
                ⚠️ This pass has expired and is no longer valid. Please contact the accounts office.
              </div>

              <button
                onClick={() => {
                  setResult(null);
                  setQrToken("");
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Verify Another Pass
              </button>
            </div>
          )}

          {/* Instructions */}
          {!result && !error && (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                📋 How to use this page:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Scan the student's QR code with this device's camera</li>
                <li>Or manually paste the 32-character token into the field above</li>
                <li>Click "Verify Pass" to check validity</li>
                <li>Pass status (valid/expired) will display instantly</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
