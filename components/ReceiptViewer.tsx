"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ReceiptViewerProps {
  proofUrl: string | null;
}

export default function ReceiptViewer({ proofUrl }: ReceiptViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isPdf = proofUrl?.endsWith(".pdf");
  const isImage = proofUrl?.match(/\.(jpg|jpeg|png)$/i);

  useEffect(() => {
    async function getSignedUrl() {
      if (!proofUrl) return;

      try {
        const client = createClient();
        const { data, error: signError } = await client.storage
          .from("payment-receipts")
          .createSignedUrl(proofUrl, 3600); // 1 hour expiry

        if (signError) throw signError;
        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }

    getSignedUrl();
  }, [proofUrl]);

  if (!proofUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm">
        ⚠️ No payment receipt uploaded
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        <p className="text-sm text-gray-600 mt-2">Loading receipt...</p>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        ❌ {error || "Failed to load receipt"}
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <img
          src={signedUrl}
          alt="Payment Receipt"
          className="w-full h-auto max-h-96 object-contain"
        />
        <div className="p-3 bg-white border-t border-gray-200 text-center">
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            View Full Size
          </a>
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📄</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">PDF Receipt</p>
            <p className="text-xs text-gray-600">
              {proofUrl.split("/").pop()}
            </p>
          </div>
        </div>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition-colors text-sm"
        >
          📥 Open PDF Receipt
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600 text-sm">
      ❓ Unknown file type: {proofUrl}
    </div>
  );
}
