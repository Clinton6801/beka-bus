"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateFare, generateReferenceCode, type TripType } from "@/lib/fare";
import { Database } from "@/types/database";
import PasswordInput from "./PasswordInput";
import TransportationGuidelinesCard from "./TransportationGuidelinesCard";

type Route = Database["public"]["Tables"]["routes"]["Row"];

interface ParentData {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  password_confirm: string;
}

interface StudentData {
  full_name: string;
  class_level: string;
  route_id: string;
  trip_type: TripType;
}

export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);

  // Form data
  const [parentData, setParentData] = useState<ParentData>({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
    password_confirm: "",
  });

  const [students, setStudents] = useState<StudentData[]>([
    { full_name: "", class_level: "", route_id: "", trip_type: "round_trip" },
  ]);

  const [routes, setRoutes] = useState<Route[]>([]);

  // Fetch routes on mount
  useEffect(() => {
    async function fetchRoutes() {
      const client = createClient();
      const { data } = await client
        .from("routes")
        .select("*")
        .eq("active", true);
      if (data) setRoutes(data);
    }
    fetchRoutes();
  }, []);

  const handleParentChange = (field: keyof ParentData, value: string) => {
    setParentData({ ...parentData, [field]: value });
  };

  const isParentDataValid = () => {
    return (
      parentData.full_name.trim() &&
      parentData.email.trim() &&
      parentData.phone.trim() &&
      parentData.password.length >= 8 &&
      parentData.password === parentData.password_confirm
    );
  };

  const handleStudentChange = (
    index: number,
    field: keyof StudentData,
    value: string
  ) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], [field]: value };
    setStudents(newStudents);
  };

  const addStudent = () => {
    setStudents([
      ...students,
      { full_name: "", class_level: "", route_id: "", trip_type: "round_trip" },
    ]);
  };

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  const isStudentValid = (student: StudentData) => {
    return (
      student.full_name.trim() &&
      student.class_level.trim() &&
      student.route_id.trim()
    );
  };

  const areAllStudentsValid = () => {
    return students.length > 0 && students.every((s) => isStudentValid(s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate parent data
      if (!parentData.full_name || !parentData.phone || !parentData.email) {
        throw new Error("Please fill in all parent details");
      }

      if (!parentData.password || parentData.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      if (parentData.password !== parentData.password_confirm) {
        throw new Error("Passwords do not match");
      }

      // Validate students
      if (
        students.length === 0 ||
        students.some((s) => !s.full_name || !s.class_level || !s.route_id)
      ) {
        throw new Error("Please fill in all student details");
      }

      // Call server API
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: parentData,
          students,
          routes, // Pass routes so server can validate them
          agreed_to_guidelines: agreedToGuidelines,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      const data = await response.json();
      setReferenceCode(data.referenceCodes[0]); // Use first reference code
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success && referenceCode) {
    return (
      <div className="max-w-2xl mx-auto bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">
          Registration Successful!
        </h2>
        <p className="text-green-700 mb-6">
          Your registration has been submitted for review.
        </p>
        <div className="bg-white rounded-lg p-6 mb-6 border border-green-200">
          <p className="text-sm text-gray-600 mb-2">Your Reference Code:</p>
          <p className="text-2xl sm:text-3xl font-mono font-bold text-green-600">
            {referenceCode}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Save this code to check your registration status
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href={`/registration/${referenceCode}/status`}
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Check Status
          </a>
          <a
            href="/"
            className="inline-block bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-6 rounded-lg"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      {/* Step 1: Parent Details */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Parent Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={parentData.full_name}
              onChange={(e) =>
                handleParentChange("full_name", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={parentData.email}
              onChange={(e) => handleParentChange("email", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={parentData.phone}
              onChange={(e) => handleParentChange("phone", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={parentData.address}
              onChange={(e) => handleParentChange("address", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            />
          </div>

          <PasswordInput
            label="Password"
            value={parentData.password}
            onChange={(value) => handleParentChange("password", value)}
            placeholder="Enter a secure password"
            error={parentData.password && parentData.password.length < 8 ? "Password must be at least 8 characters" : undefined}
            required
          />

          <PasswordInput
            label="Confirm Password"
            value={parentData.password_confirm}
            onChange={(value) => handleParentChange("password_confirm", value)}
            placeholder="Confirm your password"
            error={
              parentData.password && parentData.password_confirm && parentData.password !== parentData.password_confirm
                ? "Passwords do not match"
                : undefined
            }
            required
          />

          {!isParentDataValid() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
              ⚠️ Please fill in all required fields (marked with *) and ensure passwords match
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!isParentDataValid()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Next: Add Children
          </button>
        </div>
      )}

      {/* Step 2: Student Details */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Student Details
          </h2>

          {students.map((student, index) => (
            <div
              key={index}
              className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">
                  Student {index + 1}
                </h3>
                {students.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStudent(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={student.full_name}
                  onChange={(e) =>
                    handleStudentChange(index, "full_name", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Level *
                </label>
                <input
                  type="text"
                  placeholder="e.g., JSS 1, SS 2"
                  value={student.class_level}
                  onChange={(e) =>
                    handleStudentChange(index, "class_level", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route *
                </label>
                <select
                  value={student.route_id}
                  onChange={(e) =>
                    handleStudentChange(index, "route_id", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="">Select a route...</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="one_way"
                      checked={student.trip_type === "one_way"}
                      onChange={(e) =>
                        handleStudentChange(
                          index,
                          "trip_type",
                          e.target.value as TripType
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-gray-700">One Way</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="round_trip"
                      checked={student.trip_type === "round_trip"}
                      onChange={(e) =>
                        handleStudentChange(
                          index,
                          "trip_type",
                          e.target.value as TripType
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-gray-700">Round Trip</span>
                  </label>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addStudent}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition-colors"
          >
            + Add Another Child
          </button>

          {!areAllStudentsValid() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
              ⚠️ Please fill in all required fields for each child before proceeding
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!areAllStudentsValid()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Review & Submit
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Review Your Registration
          </h2>

          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 space-y-3">
            <h3 className="font-semibold text-gray-900">Parent Information</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <strong>Name:</strong> {parentData.full_name}
              </p>
              <p>
                <strong>Email:</strong> {parentData.email}
              </p>
              <p>
                <strong>Phone:</strong> {parentData.phone}
              </p>
              {parentData.address && (
                <p>
                  <strong>Address:</strong> {parentData.address}
                </p>
              )}
            </div>
          </div>

          {students.map((student, index) => {
            const route = routes.find((r) => r.id === student.route_id);
            return (
              <div
                key={index}
                className="bg-green-50 p-6 rounded-lg border border-green-200 space-y-3"
              >
                <h3 className="font-semibold text-gray-900">
                  Child {index + 1}: {student.full_name}
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    <strong>Class:</strong> {student.class_level}
                  </p>
                  <p>
                    <strong>Route:</strong> {route?.name}
                  </p>
                  <p>
                    <strong>Trip Type:</strong>{" "}
                    {student.trip_type === "one_way"
                      ? "One Way"
                      : "Round Trip"}
                  </p>
                </div>
              </div>
            );
          })}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Next: Guidelines & Agreement
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Guidelines Agreement */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Transportation Guidelines & Code of Conduct Agreement
          </h2>

          <TransportationGuidelinesCard
            showAgreement={true}
            agreed={agreedToGuidelines}
            onAgreedChange={setAgreedToGuidelines}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !agreedToGuidelines}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Submitting..." : "Submit Bus Service Application"}
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full transition-colors ${
              s === step ? "bg-purple-600" : s < step ? "bg-green-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </form>
  );
}

