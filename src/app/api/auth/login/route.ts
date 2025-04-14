import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sign } from "jsonwebtoken";

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

    // Find user in database with roles and their permissions
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
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

    // Check if user is active
    if (!user.isActive) {
      console.log(`[API] Login failed: User account is disabled - ${username}`);
      return NextResponse.json(
        { message: "Your account has been disabled. Please contact an administrator." },
        { status: 403 }
      );
    }

    console.log(`[API] Login successful for ${username}`);

    // Lấy thông tin vai trò RBAC thực tế
    const userRoles = user.roles.map(ur => ur.role.name);
    
    // Tạo danh sách permissions không trùng lặp từ tất cả roles của user
    const userPermissions = Array.from(new Set(
      user.roles.flatMap(ur => 
        ur.role.permissions.map(rp => rp.permission.name)
      )
    ));
    
    const isAdmin = userRoles.some(roleName => 
      roleName.toLowerCase() === "administrator"
    );

    // Create JWT token
    const token = sign(
      {
        id: user.id,
        username: user.username,
        roles: userRoles,
        permissions: userPermissions,
        isAdmin: isAdmin
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    // Create response with user data
    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      roles: userRoles,
      permissions: userPermissions,
      isAdmin: isAdmin,
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
