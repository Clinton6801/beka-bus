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
}

export async function POST(request: NextRequest) {
  try {
    const payload: RegistrationPayload = await request.json();
    const { parent, students, routes: routeList } = payload;

    // Validate input
    if (!parent.full_name || !parent.email || !parent.phone) {
      return NextResponse.json(
        { error: "Missing required parent fields" },
        { status: 400 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: "At least one student is required" },
        { status: 400 }
      );
    }

    const serverClient = await createServiceRoleClient();

    // Sign up user (creates auth.users entry)
    const { data: authData, error: signUpError } =
      await serverClient.auth.admin.createUser({
        email: parent.email,
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
        full_name: parent.full_name,
        phone: parent.phone,
        email: parent.email,
        address: parent.address,
      });

    if (parentError) throw parentError;

    // Insert students and registrations
    const referenceCodes: string[] = [];

    for (const student of students) {
      const route = routeList.find((r) => r.id === student.route_id);
      if (!route) throw new Error(`Invalid route: ${student.route_id}`);

      // Insert student
      const { data: studentData, error: studentError } = await serverClient
        .from("students")
        .insert({
          parent_id: userId,
          full_name: student.full_name,
          class_level: student.class_level,
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

      // Create registration
      const refCode = generateReferenceCode();
      const registrationData: any = {
        student_id: studentData.id,
        route_id: student.route_id,
        term: new Date().getFullYear().toString(),
        computed_fare: fareCalc.total,
        reference_code: refCode,
        status: "pending",
        agreed_to_guidelines: true,
        agreed_at: new Date().toISOString(),
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
