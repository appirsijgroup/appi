import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * Storage Serve API
 * Serves files from local storage (public/uploads/)
 * This bypasses Next.js static asset serving limitations in production
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    const filePath = searchParams.get("path");

    if (!bucket || !filePath) {
      return new NextResponse("Missing bucket or path", { status: 400 });
    }

    // Security check: Prevent path traversal (very important!)
    if (
      filePath.includes("..") ||
      filePath.startsWith("/") ||
      filePath.startsWith("\\")
    ) {
      return new NextResponse("Invalid path", { status: 403 });
    }

    // Define base path
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const fullPath = path.join(uploadsDir, bucket, filePath);

    // Check if file exists
    if (!existsSync(fullPath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Read file content
    const fileBuffer = await readFile(fullPath);

    // Determine content type based on extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".webp":
        contentType = "image/webp";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
    }

    // Return image with correct headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Long-term cache for avatars
      },
    });
  } catch (error) {
    console.error("Serve error:", error);
    return new NextResponse("Failed to serve file", { status: 500 });
  }
}
