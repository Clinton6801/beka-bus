/**
 * Email utility — currently stubbed with mock behavior.
 * Will be integrated with Resend once API key is available.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend or mock (dev).
 * Currently logs to console in development.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Mock mode: log to console
    console.log("📧 [MOCK EMAIL]", {
      to: payload.to,
      subject: payload.subject,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // TODO: Integrate Resend API when ready
  // const { Resend } = await import("resend");
  // const resend = new Resend(apiKey);
  // await resend.emails.send(payload);
}

/**
 * Send registration confirmation email with reference code.
 */
export async function sendRegistrationConfirmation(
  parentEmail: string,
  studentName: string,
  referenceCode: string,
  fare: number
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const statusUrl = `${siteUrl}/registration/${referenceCode}/status`;

  await sendEmail({
    to: parentEmail,
    subject: `Registration Confirmed — Reference ${referenceCode}`,
    html: `
      <h2>Registration Received</h2>
      <p>Thank you for registering <strong>${studentName}</strong> with BEKA Bus Portal.</p>
      <p><strong>Reference Code:</strong> ${referenceCode}</p>
      <p><strong>Fare:</strong> ₦${fare.toLocaleString()}</p>
      <p>Check your registration status at:</p>
      <p><a href="${statusUrl}">${statusUrl}</a></p>
      <p>Payment instructions will follow shortly.</p>
    `,
  });
}

/**
 * Send pass generation email to parent.
 */
export async function sendPassEmail(
  parentEmail: string,
  studentName: string,
  route: string,
  validUntil: string
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const dashboardUrl = `${siteUrl}/parent/dashboard`;

  await sendEmail({
    to: parentEmail,
    subject: `Bus Pass Generated — ${studentName}`,
    html: `
      <h2>Your Bus Pass is Ready</h2>
      <p><strong>${studentName}</strong>'s bus pass is now available.</p>
      <p><strong>Route:</strong> ${route}</p>
      <p><strong>Valid Until:</strong> ${validUntil}</p>
      <p>View and download your pass at:</p>
      <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>
    `,
  });
}

/**
 * Send rejection notification to parent.
 */
export async function sendRejectionEmail(
  parentEmail: string,
  studentName: string,
  reason: string
): Promise<void> {
  await sendEmail({
    to: parentEmail,
    subject: `Registration Status Update — ${studentName}`,
    html: `
      <h2>Registration Status</h2>
      <p>The registration for <strong>${studentName}</strong> has been reviewed.</p>
      <p><strong>Status:</strong> Rejected</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact the accounts office for more information.</p>
    `,
  });
}
