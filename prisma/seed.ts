import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Import các hàm seed
const permissionsSeeder = require("./seed-permissions");
const rolesSeeder = require("./seed-roles");
const usersSeeder = require("./seed-users");
const aiSettingsSeeder = require("./seed-ai-settings");

// Password hashing function using bcrypt (same as login API)
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log("========== BẮT ĐẦU TIẾN TRÌNH SEED DATABASE ==========");
  
  try {
    // Thực hiện seed theo thứ tự: permissions -> roles -> users -> ai-settings
    console.log("\n========== SEEDING PERMISSIONS ==========");
    await permissionsSeeder.main();
    
    console.log("\n========== SEEDING ROLES ==========");
    await rolesSeeder.main();
    
    console.log("\n========== SEEDING USERS ==========");
    await usersSeeder.main();
    
    console.log("\n========== SEEDING AI SETTINGS ==========");
    await aiSettingsSeeder.main();
    
    console.log("\n========== HOÀN THÀNH TIẾN TRÌNH SEED DATABASE ==========");
  } catch (error) {
    console.error("Lỗi trong quá trình seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
