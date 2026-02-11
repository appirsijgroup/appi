import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq, asc, or, and } from 'drizzle-orm';
import { isAdmin, isAuthorizedForUser } from '@/lib/authHelpers';
import { handleError, handleSuccess } from '@/lib/api-utils';
import { z } from 'zod';



const QueryParamsSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    // Allow limit up to 10000
    limit: z.string().transform(v => Math.min(parseInt(v) || 10000, 10000)).optional(),
});

export async function GET(request: NextRequest) {
    try {


        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        // Increase default limit to 10000 to accommodate large organizations (RSIJ GROUP)
        const { id, email, limit = 10000 } = QueryParamsSchema.parse(Object.fromEntries(url.searchParams));

        const isUserAdmin = await isAdmin();


        // Security check for specific user lookup
        if (id && !isUserAdmin) {
            const authorized = await isAuthorizedForUser(id);
            if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const whereConditions = [];
        if (id) whereConditions.push(eq(employees.id, id));
        if (email) whereConditions.push(eq(employees.email, email));

        // Construct Raw SQL with filters and subqueries for activations/records/histories
        let queryStr = `
            SELECT e.*, 
            (SELECT json_agg(month_key) FROM mutabaah_activations WHERE employee_id = e.id) as activated_months_raw,
            (SELECT json_object_agg(month_key, report_data) FROM employee_monthly_records WHERE employee_id = e.id) as monthly_activities_raw,
            (SELECT json_agg(json_build_object(
                'id', rb.id, 
                'bookTitle', rb.book_title, 
                'pagesRead', rb.pages_read, 
                'dateCompleted', rb.date_completed
            )) FROM employee_reading_history rb WHERE rb.employee_id = e.id) as reading_history_raw,
            (SELECT json_agg(json_build_object(
                'id', rq.id, 
                'surahName', rq.surah_name, 
                'surahNumber', rq.surah_number, 
                'startAyah', rq.start_ayah, 
                'endAyah', rq.end_ayah, 
                'date', rq.date
            )) FROM employee_quran_reading_history rq WHERE rq.employee_id = e.id) as quran_history_raw
            FROM employees e
        `;

        const conditions: string[] = [];
        if (id) conditions.push(`e.id = '${id.replace(/'/g, "''")}'`);
        if (email) conditions.push(`e.email = '${email.replace(/'/g, "''")}'`);

        if (conditions.length > 0) {
            queryStr += ' WHERE ' + conditions.join(' AND ');
        }

        queryStr += ` ORDER BY e.name ASC LIMIT ${limit}`;


        const result = await db.execute(queryStr);
        const results = result.rows;



        const sanitizedEmployees = results.map((emp: any) => {
            const {
                password,
                activated_months_raw,
                monthly_activities_raw,
                reading_history_raw,
                quran_history_raw,
                ...rest
            } = emp;

            return {
                ...rest,
                profilePicture: rest.profilePicture || rest.profile_picture || null,
                monthly_activities: monthly_activities_raw || {},
                activated_months: Array.isArray(activated_months_raw)
                    ? activated_months_raw
                    : [],
                readingHistory: reading_history_raw || [],
                quranReadingHistory: quran_history_raw || [],
                avatarUrl: rest.profilePicture || rest.profile_picture || null,
            };
        });

        return handleSuccess({ employees: sanitizedEmployees });

    } catch (error) {
        console.error('❌ [API Employees] Error:', error);
        return handleError(error);
    }
}
