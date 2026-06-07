import { NextRequest, NextResponse } from "next/server";
import { signToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!adminUser || !adminPass || !secret) {
      return NextResponse.json(
        { error: "Server auth not configured" },
        { status: 500 }
      );
    }

    if (username !== adminUser || password !== adminPass) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create signed token
    const token = await signToken(
      { user: username, iat: Date.now() },
      secret
    );

    const res = NextResponse.json({ ok: true, user: username });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
