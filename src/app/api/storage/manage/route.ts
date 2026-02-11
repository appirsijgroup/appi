import { NextRequest, NextResponse } from 'next/server';
import { unlink, rm } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';

/**
 * Storage Management API
 * Handles file deletion from local storage
 */

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bucket = searchParams.get('bucket');
        const filePath = searchParams.get('path');

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

        // Tentukan path file/folder yang akan dihapus
        const targetPath = path.join(process.cwd(), 'public', 'uploads', bucket, filePath);

        // Cek apakah file/folder ada
        if (!existsSync(targetPath)) {
            return NextResponse.json(
                { error: 'File or folder not found' },
                { status: 404 }
            );
        }

        // Hapus file atau folder
        const stats = statSync(targetPath);

        if (stats.isDirectory()) {
            // Hapus folder beserta isinya
            await rm(targetPath, { recursive: true, force: true });
        } else {
            // Hapus file
            await unlink(targetPath);
        }

        return NextResponse.json({
            success: true,
            message: 'File/folder deleted successfully'
        });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete file/folder', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
