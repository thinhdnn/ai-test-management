import { verify } from "jsonwebtoken";
import { prisma } from "./db";

/**
 * Get the current user ID from auth token in the request
 * @param request The request object containing cookies
 * @returns User ID if found and valid, null otherwise
 */
export function getCurrentUserId(request: Request): string | null {
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
      return null;
    }

    // Decode token
    const decoded = verify(token, process.env.JWT_SECRET || "secret") as {
      id: string;
      username: string;
    };

    return decoded.id;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

/**
 * Check if user exists in database
 */
export async function userExists(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    return !!user;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
}

/**
 * Returns an object with createdBy and updatedBy fields
 * @param userId The ID of the user performing the action
 * @returns Object with createdBy and updatedBy fields
 */
export const AuditFields = {
  forCreate: (userId: string | null) => ({
    createdBy: userId || null,
    updatedBy: userId || null,
  }),

  /**
   * Returns an object with updatedBy field
   * @param userId The ID of the user performing the action
   * @returns Object with updatedBy field
   */
  forUpdate: (userId: string | null) => ({
    updatedBy: userId || null,
  }),
};
