import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Seed staff users for testing
 * POST /api/seed/staff with optional body:
 * {
 *   "accounts_email": "accounts@example.com",
 *   "accounts_password": "SecurePassword123",
 *   "admin_email": "admin@example.com",
 *   "admin_password": "AdminPassword123"
 * }
 *
 * Default credentials:
 * - Accounts Officer: accounts@beka.ng / Password123
 * - Admin: admin@beka.ng / AdminPassword123
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authorization check
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.SEED_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const accountsEmail = body.accounts_email || "accounts@beka.ng";
    const accountsPassword = body.accounts_password || "Password123";
    const adminEmail = body.admin_email || "admin@beka.ng";
    const adminPassword = body.admin_password || "AdminPassword123";

    const serverClient = await createServiceRoleClient();

    const createdUsers = [];
    const errors = [];

    // Create Accounts Officer
    try {
      const { data: accountsUser, error: accountsError } =
        await serverClient.auth.admin.createUser({
          email: accountsEmail,
          password: accountsPassword,
          email_confirm: true,
        });

      if (accountsError) {
        if (accountsError.message.includes("already exists")) {
          errors.push("Accounts user already exists");
        } else {
          throw accountsError;
        }
      } else if (accountsUser?.user?.id) {
        // Insert into staff table
        const { error: staffError } = await serverClient
          .from("staff")
          .insert({
            id: accountsUser.user.id,
            full_name: "Accounts Officer",
            role: "accounts",
          });

        if (staffError) throw staffError;
        createdUsers.push({
          role: "accounts",
          email: accountsEmail,
          password: accountsPassword,
        });
      }
    } catch (err) {
      errors.push(
        `Accounts user error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }

    // Create Admin
    try {
      const { data: adminUser, error: adminError } =
        await serverClient.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
        });

      if (adminError) {
        if (adminError.message.includes("already exists")) {
          errors.push("Admin user already exists");
        } else {
          throw adminError;
        }
      } else if (adminUser?.user?.id) {
        // Insert into staff table
        const { error: staffError } = await serverClient
          .from("staff")
          .insert({
            id: adminUser.user.id,
            full_name: "System Administrator",
            role: "admin",
          });

        if (staffError) throw staffError;
        createdUsers.push({
          role: "admin",
          email: adminEmail,
          password: adminPassword,
        });
      }
    } catch (err) {
      errors.push(
        `Admin user error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }

    return NextResponse.json({
      success: createdUsers.length > 0,
      created: createdUsers,
      errors: errors.length > 0 ? errors : undefined,
      message:
        createdUsers.length > 0
          ? `Successfully created ${createdUsers.length} staff user(s)`
          : "No users created. Users may already exist.",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Staff seeding endpoint. Send POST request to create test staff users.",
    example: {
      method: "POST",
      body: {
        accounts_email: "accounts@beka.ng",
        accounts_password: "Password123",
        admin_email: "admin@beka.ng",
        admin_password: "AdminPassword123",
      },
    },
  });
}
