import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { calculateFare, generateReferenceCode } from "@/lib/fare";
import { sendRegistrationConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

interface RegistrationPayload {
  parent: {
    full_name: string;
    phone: string;
    email: string;
    address: string;
    password: string;
  };
  students: Array<{
    full_name: string;
    class_level: string;
    route_id: string;
    trip_type: "one_way" | "round_trip";
  }>;
  routes: Array<{
    id: string;
    name: string;
    base_fare_one_way: number;
    base_fare_round_trip: number;
  }>;
  agreed_to_guidelines: boolean;
}

// Input validation & sanitization helper
function validateInput(input: {
  full_name: string;
  phone: string;
  email: string;
}): string | null {
  // Trim whitespace
  const fullName = input.full_name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();

  // Validate name length and characters (prevent XSS, SQL injection patterns)
  // Allow: letters, spaces, hyphens, apostrophes
  if (!fullName || fullName.length > 255) {
    return "Full name is required and must be under 255 characters";
  }

  if (!/^[a-zA-Z\s'-]+$/.test(fullName)) {
    return "Full name can only contain letters, spaces, hyphens, and apostrophes";
  }

  // Prevent common XSS patterns in names
  if (
    fullName.includes("<") ||
    fullName.includes(">") ||
    fullName.includes("{") ||
    fullName.includes("}") ||
    fullName.includes("script") ||
    fullName.includes("onclick")
  ) {
    return "Full name contains invalid characters";
  }

  // Validate phone - extract digits only
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return "Phone number must contain 10-15 digits";
  }

  // Validate phone format (allow common patterns: +234, parentheses, spaces, hyphens)
  if (!/^[\d\s\-\+\(\)]+$/.test(phone)) {
    return "Phone number contains invalid characters";
  }

  // Validate email format (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  // Prevent SQL injection patterns in email
  if (
    email.includes("--") ||
    email.includes(";") ||
    email.includes("'") ||
    email.includes('"') ||
    email.includes("/*") ||
    email.includes("*/")
  ) {
    return "Email contains invalid characters";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload: RegistrationPayload = await request.json();
    const { parent, students, routes: routeList, agreed_to_guidelines } = payload;

    // Basic input validation
    if (!parent.full_name || !parent.email || !parent.phone) {
      return NextResponse.json(
        { error: "Missing required parent fields" },
        { status: 400 }
      );
    }

    // Validate address if provided
    if (parent.address) {
      const address = parent.address.trim();
      if (address.length > 500) {
        return NextResponse.json(
          { error: "Address must be under 500 characters" },
          { status: 400 }
        );
      }
      // Basic check: prevent obvious injection attempts
      if (address.includes("--") || address.includes("/*") || address.includes("*/")) {
        return NextResponse.json(
          { error: "Address contains invalid characters" },
          { status: 400 }
        );
      }
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: "At least one student is required" },
        { status: 400 }
      );
    }

    // Validate max number of students per registration (reasonable limit)
    if (students.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 students per registration" },
        { status: 400 }
      );
    }

    // Validate password
    if (!parent.password || parent.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate guidelines agreement
    if (!agreed_to_guidelines) {
      return NextResponse.json(
        { error: "You must agree to the transportation guidelines" },
        { status: 400 }
      );
    }

    // Sanitize and validate parent data
    const inputValidationError = validateInput(parent);
    if (inputValidationError) {
      return NextResponse.json(
        { error: inputValidationError },
        { status: 400 }
      );
    }

    // Validate each student
    for (const student of students) {
      // Validate student name
      const studentName = student.full_name.trim();
      if (!studentName || studentName.length > 255) {
        return NextResponse.json(
          { error: "Student name is required and must be under 255 characters" },
          { status: 400 }
        );
      }

      // Prevent XSS/injection in student name (same rules as parent name)
      if (
        !/^[a-zA-Z\s'-]+$/.test(studentName) ||
        studentName.includes("<") ||
        studentName.includes(">") ||
        studentName.includes("script")
      ) {
        return NextResponse.json(
          { error: "Invalid student name format" },
          { status: 400 }
        );
      }

      // Validate class level
      const classLevel = student.class_level.trim();
      if (!classLevel || classLevel.length > 100) {
        return NextResponse.json(
          { error: "Class level is required and must be under 100 characters" },
          { status: 400 }
        );
      }

      // Validate class level format (alphanumeric, spaces, hyphens only)
      if (!/^[a-zA-Z0-9\s-]+$/.test(classLevel)) {
        return NextResponse.json(
          { error: "Invalid class level format" },
          { status: 400 }
        );
      }

      // Validate route ID (UUID format)
      const routeIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!student.route_id || !routeIdRegex.test(student.route_id)) {
        return NextResponse.json(
          { error: "Invalid route selected" },
          { status: 400 }
        );
      }

      // Validate trip type
      if (!["one_way", "round_trip"].includes(student.trip_type)) {
        return NextResponse.json(
          { error: "Invalid trip type - must be 'one_way' or 'round_trip'" },
          { status: 400 }
        );
      }
    }

    const serverClient = await createServiceRoleClient();

    // Check for duplicate email first (to prevent auth user creation failure)
    const { data: existingParent } = await serverClient
      .from("parents")
      .select("id")
      .eq("email", parent.email.toLowerCase())
      .single();

    if (existingParent) {
      return NextResponse.json(
        { error: "Email already registered. Please log in instead." },
        { status: 400 }
      );
    }

    // Sign up user (creates auth.users entry)
    const { data: authData, error: signUpError } =
      await serverClient.auth.admin.createUser({
        email: parent.email.toLowerCase(),
        password: parent.password,
        email_confirm: true, // Auto-confirm for now
      });

    if (signUpError) {
      // Check if user already exists
      if (signUpError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "Email already registered. Please log in instead." },
          { status: 400 }
        );
      }
      throw signUpError;
    }

    const userId = authData?.user?.id;
    if (!userId) throw new Error("Failed to create user account");

    // Insert parent, students, and registrations using service role (bypasses RLS)
    // Insert parent record
    const { error: parentError } = await serverClient
      .from("parents")
      .insert({
        id: userId,
        full_name: parent.full_name.trim(),
        phone: parent.phone.trim(),
        email: parent.email.toLowerCase(),
        address: parent.address?.trim() || "",
      });

    if (parentError) throw parentError;

    // Insert students and registrations
    const referenceCodes: string[] = [];

    // Validate all routes exist in database (server-side check, not client-provided)
    const routeIds = students.map((s) => s.route_id);
    const { data: validRoutes, error: routeError } = await serverClient
      .from("routes")
      .select("id, name, base_fare_one_way, base_fare_round_trip, active")
      .in("id", routeIds);

    if (routeError || !validRoutes || validRoutes.length !== routeIds.length) {
      throw new Error("Invalid route selected. Please refresh and try again.");
    }

    // Check all routes are active
    for (const route of validRoutes) {
      if (!route.active) {
        throw new Error(`Route "${route.name}" is not currently available`);
      }
    }

    for (const student of students) {
      // Use server-validated routes instead of client-provided
      const route = validRoutes.find((r) => r.id === student.route_id);
      if (!route) throw new Error(`Invalid route: ${student.route_id}`);

      // Insert student
      const { data: studentData, error: studentError } = await serverClient
        .from("students")
        .insert({
          parent_id: userId,
          full_name: student.full_name.trim(),
          class_level: student.class_level.trim(),
          route_id: student.route_id,
          trip_type: student.trip_type,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Calculate fare
      const fareCalc = calculateFare(
        [
          {
            route: {
              base_fare_one_way: route.base_fare_one_way,
              base_fare_round_trip: route.base_fare_round_trip,
            },
            tripType: student.trip_type,
          },
        ],
        []
      );

      // Create registration with guidelines agreement tracked
      const refCode = generateReferenceCode();
      const now = new Date().toISOString();
      const registrationData: any = {
        student_id: studentData.id,
        route_id: student.route_id,
        term: new Date().getFullYear().toString(),
        computed_fare: fareCalc.total,
        reference_code: refCode,
        status: "pending",
        agreed_to_guidelines: agreed_to_guidelines,
        agreed_at: agreed_to_guidelines ? now : null,
      };

      const { error: regError } = await serverClient
        .from("registrations")
        .insert(registrationData);

      if (regError) throw regError;

      // Send confirmation email
      await sendRegistrationConfirmation(
        parent.email,
        student.full_name,
        refCode,
        fareCalc.total
      );

      referenceCodes.push(refCode);
    }

    return NextResponse.json({
      success: true,
      userId,
      referenceCodes,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
