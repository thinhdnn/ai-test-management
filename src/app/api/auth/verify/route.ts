import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verify } from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    // Get token from request body
    const { token } = await request.json();

    if (!token) {
      console.log("[API/auth/verify] No token provided");
      return NextResponse.json(
        { valid: false, message: "No token provided" },
        { status: 400 }
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
        roles: {
          include: {
            role: true
          }
        }
      },
    });

    if (!user) {
      console.log(
        `[API/auth/verify] User with ID ${decoded.id} not found in database`
      );
      return NextResponse.json(
        { valid: false, message: "User not found in database" },
        { status: 200 } // Return 200 but with valid=false
      );
    }

    // Lấy thông tin vai trò RBAC thực tế
    const userRoles = user.roles.map(ur => ur.role.name);
    const isAdmin = userRoles.some(roleName => 
      roleName.toLowerCase() === "administrator"
    );

    console.log(
      `[API/auth/verify] Successfully verified user: ${user.username} with roles: ${userRoles.join(', ')}`
    );

    // Return verification result with actual roles from RBAC
    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        roles: userRoles,
        isAdmin: isAdmin
      },
    });
  } catch (error) {
    console.error("[API/auth/verify] Error verifying token:", error);
    return NextResponse.json(
      { valid: false, message: "Invalid or expired token" },
      { status: 200 } // Return 200 but with valid=false
    );
  }
}
