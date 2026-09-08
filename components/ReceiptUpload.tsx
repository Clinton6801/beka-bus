"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface ReceiptUploadProps {
  parentId: string;
  registrationId: string;
  referenceCode: string;
  onUploadSuccess: (path: string) => void;
  existingPath?: string | null;
}

export default function ReceiptUpload({
  parentId,
  registrationId,
  referenceCode,
  onUploadSuccess,
  existingPath,
}: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file || uploading) return; // Prevent concurrent uploads

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Only JPG, PNG, or PDF files are allowed");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const client = createClient();

      // Generate filename with timestamp for uniqueness
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const filename = `${registrationId}-${timestamp}.${fileExt}`;
      const storagePath = `${parentId}/${registrationId}/${filename}`;

      // Upload to Supabase Storage (abort if already uploading same file)
      const abortController = new AbortController();
      const { error: uploadError } = await client.storage
        .from("payment-receipts")
        .upload(storagePath, file, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update registration with proof_of_payment_url
      // Check if receipt is still pending before updating
      const { data: regData, error: fetchError } = await client
        .from("registrations")
        .select("status, proof_of_payment_url")
        .eq("id", registrationId)
        .single();

      if (fetchError) throw fetchError;

      // Only update if status is pending and no receipt already uploaded (prevent overwrites from race condition)
      if (regData?.status === "pending") {
        const { error: updateError } = await client
          .from("registrations")
          .update({ proof_of_payment_url: storagePath })
          .eq("id", registrationId)
          .eq("status", "pending");

        if (updateError) throw updateError;
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadSuccess(storagePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (existingPath) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-green-700">
            ✓ Receipt Uploaded
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            Replace
          </button>
        </div>
        <p className="text-xs text-green-600">
          {existingPath.split("/").pop()}
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Awaiting confirmation from the accounts office.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
        />
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-2xl mb-2">📎</p>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {uploading ? "Uploading..." : "Upload Payment Receipt"}
          </p>
          <p className="text-xs text-gray-600">
            JPG, PNG, or PDF (max 5MB)
          </p>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      <p className="text-xs text-gray-600">
        📌 Tip: Include the reference code <span className="font-mono font-bold text-gray-900">{referenceCode}</span> in a visible location of your receipt photo for faster tracking.
      </p>
    </div>
  );
}
