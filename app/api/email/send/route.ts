import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: EmailPayload = await request.json();
    const { to, subject, html } = payload;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required email fields" },
        { status: 400 }
      );
    }

    // Use the email utility
    await sendEmail({
      to,
      subject,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
