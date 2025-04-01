import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const fixtureId = resolvedParams.fixtureId;
    
    const { path: filePath, content } = await request.json();
    
    // Đảm bảo fixture thuộc về project
    const fixture = await prisma.fixture.findUnique({
      where: {
        id: fixtureId,
        projectId: projectId,
      },
    });

    if (!fixture) {
      return NextResponse.json(
        { error: "Fixture not found or does not belong to this project" },
        { status: 404 }
      );
    }

    // Xác định thư mục gốc của project
    const projectRoot = process.env.PROJECT_ROOT || "./playwright-tests";
    
    // Đường dẫn đầy đủ đến file fixture
    const fullPath = path.join(projectRoot, filePath);
    
    // Đảm bảo thư mục tồn tại
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Ghi nội dung file
    fs.writeFileSync(fullPath, content);
    
    // Cập nhật đường dẫn file trong database
    await prisma.fixture.update({
      where: { id: fixtureId },
      data: { fixtureFilePath: filePath },
    });

    return NextResponse.json({ success: true, path: filePath });
  } catch (error: unknown) {
    console.error("Error creating fixture file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create fixture file" },
      { status: 500 }
    );
  }
} 