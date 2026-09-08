import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface VerifyRequest {
  qr_token: string;
}

interface VerifyResponse {
  valid: boolean;
  student_name?: string;
  route?: string;
  term?: string;
  valid_until?: string;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyResponse>> {
  try {
    const body: VerifyRequest = await request.json();
    const { qr_token } = body;

    if (!qr_token || typeof qr_token !== "string") {
      return NextResponse.json(
        {
          valid: false,
          error: "QR token is required",
        },
        { status: 400 }
      );
    }

    const client = await createClient();

    // Lookup bus pass by QR token
    const { data: passData, error: passError } = await client
      .from("bus_passes")
      .select(
        `
        *,
        student:students(*),
        registration:registrations(route:routes(*))
      `
      )
      .eq("qr_token", qr_token)
      .single();

    if (passError || !passData) {
      return NextResponse.json(
        {
          valid: false,
          error: "Pass not found",
        },
        { status: 404 }
      );
    }

    // Check if pass is still valid
    const validUntil = new Date(passData.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validUntil.setHours(0, 0, 0, 0);

    const isValid = validUntil >= today;

    // Extract nested data
    const student = Array.isArray(passData.student)
      ? passData.student[0]
      : passData.student;
    const registration = Array.isArray(passData.registration)
      ? passData.registration[0]
      : passData.registration;
    const route = registration?.route;

    if (!isValid) {
      return NextResponse.json({
        valid: false,
        student_name: student?.full_name,
        route: route?.name,
        term: passData.term,
        valid_until: passData.valid_until,
        message: `Pass expired on ${new Date(passData.valid_until).toLocaleDateString("en-NG")}`,
      });
    }

    return NextResponse.json({
      valid: true,
      student_name: student?.full_name,
      route: route?.name,
      term: passData.term,
      valid_until: passData.valid_until,
      message: `✓ Pass is valid. Valid until ${new Date(passData.valid_until).toLocaleDateString("en-NG")}`,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}
