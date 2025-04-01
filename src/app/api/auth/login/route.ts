import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sign } from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    console.log(`[API] Login attempt for username: ${username}`);

    // Validate input
    if (!username || !password) {
      console.log(`[API] Login failed: Missing required fields`);
      return NextResponse.json(
        { message: "Please enter all required information" },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Check if user doesn't exist
    if (!user) {
      console.log(`[API] Login failed: User not found - ${username}`);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`[API] Login failed: Invalid password for ${username}`);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log(`[API] Login successful for ${username}`);

    // Create JWT token
    const token = sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    // Create response with user data
    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      token: token, // Include token in response for client-side storage
    });

    // Set cookie in the response
    console.log(
      `[API] Setting auth-token cookie, secure: ${
        process.env.NODE_ENV === "production"
      }, sameSite: lax`
    );
    response.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Debug - additional headers
    response.headers.set("x-auth-token", "set");

    console.log(`[API] Login response ready with token`);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "An error occurred during login" },
      { status: 500 }
    );
  }
}
