import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Storage Upload API
 * Handles file uploads to local storage (public/uploads/)
 * Replaces External Storage with local file system
 */

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string;
        const filePath = formData.get('filePath') as string;

        // Validasi input
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!bucket) {
            return NextResponse.json(
                { error: 'Bucket name is required' },
                { status: 400 }
            );
        }

        if (!filePath) {
            return NextResponse.json(
                { error: 'File path is required' },
                { status: 400 }
            );
        }

        // Konversi file ke buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Tentukan path penyimpanan
        // Format: public/uploads/{bucket}/{filePath}
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', bucket);
        const fullFilePath = path.join(uploadDir, filePath);

        // Buat direktori jika belum ada
        const fileDir = path.dirname(fullFilePath);
        if (!existsSync(fileDir)) {
            await mkdir(fileDir, { recursive: true });
        }

        // Simpan file
        await writeFile(fullFilePath, buffer);

        // Generate public URL
        // Format: /uploads/{bucket}/{filePath}
        const publicUrl = `/uploads/${bucket}/${filePath}`;

        return NextResponse.json({
            success: true,
            publicUrl,
            message: 'File uploaded successfully'
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
