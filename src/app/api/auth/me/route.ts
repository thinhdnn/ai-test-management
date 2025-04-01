import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verify } from "jsonwebtoken";

export async function GET(request: Request) {
  try {
    // Get token from cookie in request headers
    const cookieHeader = request.headers.get("cookie");
    let token: string | undefined;

    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
      const authCookie = cookies.find((cookie) =>
        cookie.startsWith("auth-token=")
      );
      if (authCookie) {
        token = authCookie.split("=")[1];
      }
    }

    if (!token) {
      console.log("[API/auth/me] Authentication token not found");
      return NextResponse.json(
        { message: "Authentication token not found" },
        { status: 401 }
      );
    }

    // Decode token
    const decoded = verify(token, process.env.JWT_SECRET || "secret") as {
      id: string;
      username: string;
    };

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      console.log(
        `[API/auth/me] User with ID ${decoded.id} not found in database`
      );
      return NextResponse.json(
        { message: "User not found or invalid session" },
        { status: 401 }
      );
    }

    console.log(
      `[API/auth/me] Successfully authenticated user: ${user.username}`
    );

    // Return user information
    return NextResponse.json({
      ...user,
      token, // Include token in response for client-side storage
    });
  } catch (error) {
    console.error("[API/auth/me] Error retrieving user information:", error);
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
