import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('--- RUNNING DB MIGRATION: ADD attendance_mode TO activities ---');

        // Add attendance_mode column to activities table
        await query(`
            ALTER TABLE activities 
            ADD COLUMN IF NOT EXISTS attendance_mode text DEFAULT 'self';
        `, []);

        console.log('--- MIGRATION SUCCESSFUL ---');

        return NextResponse.json({
            success: true,
            message: 'Kolom attendance_mode berhasil ditambahkan ke tabel activities.'
        });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
