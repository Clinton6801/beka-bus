"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (token: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Select rear camera by default (usually last one)
          const rearCamera = devices.find(
            (d) => d.label.toLowerCase().includes("rear") || d.label.toLowerCase().includes("back")
          ) || devices[devices.length - 1];
          setSelectedCamera(rearCamera.id);
        }
      } catch (err) {
        setError("No camera access available");
      }
    }

    getCameras();
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      setError("No camera selected");
      return;
    }

    try {
      setError(null);
      scannerRef.current = new Html5Qrcode("qr-scanner-container");

      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR code scanned successfully
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Error in scanning, ignore
        }
      );

      setIsScanning(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start scanning";
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isScanning]);

  return (
    <div className="space-y-4">
      {/* Camera Selection */}
      {cameras.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Camera
          </label>
          <select
            value={selectedCamera || ""}
            onChange={(e) => {
              setSelectedCamera(e.target.value);
              if (isScanning) {
                stopScanning();
              }
            }}
            disabled={isScanning}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Scanner Container */}
      <div id="qr-scanner-container" className="w-full bg-black rounded-lg overflow-hidden" />

      {/* Controls */}
      <div className="flex gap-3">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!selectedCamera}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            📷 Start Camera
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            ⏹️ Stop Camera
          </button>
        )}
      </div>

      {isScanning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm text-center">
          ✓ Camera is active. Position QR code in the frame.
        </div>
      )}
    </div>
  );
}
