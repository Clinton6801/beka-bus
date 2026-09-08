"use client";

import { transportationGuidelines } from "@/lib/transportationGuidelines";

interface TransportationGuidelinesCardProps {
  showAgreement?: boolean;
  agreed?: boolean;
  onAgreedChange?: (agreed: boolean) => void;
}

export default function TransportationGuidelinesCard({
  showAgreement = false,
  agreed = false,
  onAgreedChange,
}: TransportationGuidelinesCardProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {transportationGuidelines.title}
        </h3>
        <a
          href={transportationGuidelines.pdfLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap"
        >
          📄 Read Full Guidelines (PDF)
        </a>
      </div>

      {/* Key Points */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6 space-y-4">
        {transportationGuidelines.keyPoints.map((point, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-600 text-white text-xs font-bold">
                {index + 1}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-700 font-semibold mb-1">
                {point.title}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {point.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Agreement Checkbox */}
      {showAgreement && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => onAgreedChange?.(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">
              <a
                href={transportationGuidelines.pdfLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {transportationGuidelines.agreementText.split(" policy.")[0]}
              </a>{" "}
              policy.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
