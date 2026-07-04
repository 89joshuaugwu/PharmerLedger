// POST /api/users/create — admin-only. Creates the Firebase Auth account
// AND the /users/{uid} Firestore doc in one call, since the client never
// has admin SDK access (this is why there's no public signup page — see
// README "First admin account" for how the very first admin is bootstrapped
// manually in Firebase Console before this route can be used at all).
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireActiveUser, requireAdmin, UnauthorizedError } from "@/lib/api-auth";

interface CreateUserBody {
  name: string;
  email: string;
  tempPassword: string;
  role: "admin" | "attendant";
}

export async function POST(request: NextRequest) {
  try {
    const caller = await requireActiveUser(request);
    requireAdmin(caller);

    const body: CreateUserBody = await request.json();
    if (!body.name || !body.email || !body.tempPassword || !body.role) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (body.tempPassword.length < 6) {
      return NextResponse.json({ error: "Temporary password must be at least 6 characters." }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email: body.email,
      password: body.tempPassword,
      displayName: body.name,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: body.email,
      displayName: body.name,
      role: body.role,
      active: true,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ uid: userRecord.uid }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err?.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "A staff account with this email already exists." }, { status: 409 });
    }
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Could not create staff account." }, { status: 500 });
  }
}
