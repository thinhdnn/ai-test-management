import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ message: "Logout successful" });

    // Delete auth-token cookie in the response
    response.cookies.set({
      name: "auth-token",
      value: "",
      httpOnly: true,
      path: "/",
      expires: new Date(0), // Expire immediately
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
