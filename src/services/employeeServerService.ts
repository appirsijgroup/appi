import { query } from '@/lib/db';
import { getAggregatedMonthlyActivities } from './monthlyActivityServerService';
import type { Employee, Role, FunctionalRole, MonthlyActivityProgress, ReadingHistory, QuranReadingHistory } from '@/types';

// Helper interface for snake_case data coming from DB
interface RawSqlEmployee {
    id: string;
    email: string;
    password?: string;
    name: string;
    hospital_id?: string;
    unit?: string;
    bagian?: string;
    profession_category?: 'MEDIS' | 'NON MEDIS';
    profession?: string;
    gender?: 'Laki-laki' | 'Perempuan';
    last_visit_date?: string;
    role: Role;
    is_active?: boolean;
    notification_enabled?: boolean;
    profile_picture?: string;
    ka_unit_id?: string;
    mentor_id?: string;
    supervisor_id?: string;
    manager_id?: string;
    dirut_id?: string;
    can_be_mentor?: boolean;
    can_be_supervisor?: boolean;
    can_be_manager?: boolean;
    can_be_ka_unit?: boolean;
    can_be_dirut?: boolean;
    can_be_bph?: boolean;
    functional_roles?: FunctionalRole[];
    manager_scope?: any;
    activated_months?: string[];
    monthly_activities?: Record<string, MonthlyActivityProgress>;
    reading_history_raw?: ReadingHistory[];
    quran_history_raw?: QuranReadingHistory[];
    signature?: string | null;
    achievements?: any[];
    must_change_password?: boolean;
    is_profile_complete?: boolean;
    email_verified?: boolean;
    auth_user_id?: string;
    location_id?: string;
    location_name?: string;
    managed_hospital_ids?: string[];
    last_announcement_read_timestamp?: string | number | null;
    employment_status?: 'Pegawai Tetap' | 'Kontrak' | 'Mitra' | 'Part Time';
    nik?: string;
    phone_number?: string;
    address?: string;
    birth_place?: string;
    birth_date?: string;
}

// Helper function to convert snake_case to camelCase for employee objects
export const convertToCamelCase = (emp: RawSqlEmployee): Employee => {
    return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        password: emp.password || '',
        role: emp.role,
        lastVisitDate: emp.last_visit_date || '',
        isActive: emp.is_active ?? true,
        notificationEnabled: emp.notification_enabled ?? true,
        profilePicture: emp.profile_picture || null,
        monthlyActivities: emp.monthly_activities || {},
        kaUnitId: emp.ka_unit_id || null,
        supervisorId: emp.supervisor_id || null,
        mentorId: emp.mentor_id || null,
        dirutId: emp.dirut_id || null,
        canBeMentor: emp.can_be_mentor ?? false,
        canBeSupervisor: emp.can_be_supervisor ?? false,
        canBeKaUnit: emp.can_be_ka_unit ?? false,
        canBeDirut: emp.can_be_dirut ?? false,
        canBeBPH: emp.can_be_bph ?? false,
        canBeManager: emp.can_be_manager ?? false,
        managerId: emp.manager_id || null,
        functionalRoles: emp.functional_roles || [],
        managerScope: typeof emp.manager_scope === 'string' ? JSON.parse(emp.manager_scope) : emp.manager_scope,
        locationId: emp.location_id,
        locationName: emp.location_name,
        signature: emp.signature,
        lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp ? (typeof emp.last_announcement_read_timestamp === 'string' ? new Date(emp.last_announcement_read_timestamp).getTime() : Number(emp.last_announcement_read_timestamp)) : undefined,
        managedHospitalIds: emp.managed_hospital_ids || [],
        mustChangePassword: emp.must_change_password ?? false,
        hospitalId: emp.hospital_id || '',
        professionCategory: emp.profession_category || 'NON MEDIS',
        isProfileComplete: emp.is_profile_complete ?? false,
        emailVerified: emp.email_verified ?? false,
        avatarUrl: emp.profile_picture || null,
        authUserId: emp.auth_user_id || null,
        nik: emp.nik,
        phoneNumber: emp.phone_number,
        address: emp.address,
        birthPlace: emp.birth_place,
        birthDate: emp.birth_date,
        gender: emp.gender || 'Laki-laki',
        employmentStatus: emp.employment_status,
        unit: emp.unit || '',
        bagian: emp.bagian || '',
        profession: emp.profession || '',
    } as Employee;
};

/**
 * Get full employee data with all linked records (history, todos, etc.)
 * MIGRATED to use local PostgreSQL connection.
 */
export async function getFullEmployeeData(userId: string) {
    try {
        // 1. Fetch basic employee data
        const { rows: employeeRows } = await query(
            'SELECT * FROM employees WHERE id = $1',
            [userId]
        );
        const employee = employeeRows[0];

        if (!employee) {
            console.error('Error: Employee not found for ID:', userId);
            return null;
        }

        // 2. Fetch linked data and monthly activities in parallel
        const [
            { rows: readingHistoryData },
            { rows: quranHistoryData },
            { rows: todosData },
            aggregatedActivities,
            { rows: activationData }
        ] = await Promise.all([
            query(
                `SELECT * FROM employee_reading_history WHERE employee_id = $1 ORDER BY created_at DESC`,
                [userId]
            ),
            query(
                `SELECT * FROM employee_quran_reading_history WHERE employee_id = $1 ORDER BY date DESC`,
                [userId]
            ),
            query(
                `SELECT * FROM employee_todos WHERE employee_id = $1 ORDER BY created_at DESC`,
                [userId]
            ),
            getAggregatedMonthlyActivities(userId),
            query(
                `SELECT month_key FROM mutabaah_activations WHERE employee_id = $1`,
                [userId]
            )
        ]);

        // 3. Convert formats
        const convertedReadingHistory = (readingHistoryData || []).map((item: any) => ({
            id: item.id,
            bookTitle: item.book_title,
            pagesRead: item.pages_read,
            dateCompleted: item.date_completed,
            createdAt: item.created_at
        }));

        const convertedQuranHistory = (quranHistoryData || []).map((item: any) => ({
            id: item.id,
            date: item.date,
            surahName: item.surah_name,
            surahNumber: item.surah_number,
            startAyah: item.start_ayah,
            endAyah: item.end_ayah,
            createdAt: item.created_at
        }));

        const convertedTodos = (todosData || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            notes: item.description,
            completed: item.is_completed,
            date: item.due_date,
            priority: item.priority,
            completedAt: item.completed_at,
            createdAt: item.created_at
        }));

        // Extract activated months from new table
        const realActivatedMonths = (activationData || []).map((row: any) => row.month_key);

        const basicEmployeeInCamelCase = convertToCamelCase(employee as RawSqlEmployee);

        // 4. Combine and return
        return {
            ...basicEmployeeInCamelCase,
            activatedMonths: realActivatedMonths, // Override with data from new table
            activated_months: realActivatedMonths, // Override explicit snake_case too for compatibility
            monthlyActivities: aggregatedActivities, // Now populated from the server!
            readingHistory: convertedReadingHistory,
            quranReadingHistory: convertedQuranHistory,
            todoList: convertedTodos,
        } as (Employee & { todoList: any[] });
    } catch (error) {
        console.error('getFullEmployeeData error:', error);
        return null; // Return null on error primarily
    }
}

/**
 * LIGHTWEIGHT version of getFullEmployeeData.
 * Only fetches the employee table and activation status.
 * Used for fast login/auth checks.
 */
export async function getEssentialEmployeeData(userId: string) {
    try {
        const { rows: employeeRows } = await query(
            'SELECT * FROM employees WHERE id = $1',
            [userId]
        );
        const employee = employeeRows[0];

        if (!employee) {
            return null;
        }

        const [
            aggregatedActivities,
            { rows: activationData },
            { rows: readingHistoryData },
            { rows: quranHistoryData }
        ] = await Promise.all([
            getAggregatedMonthlyActivities(userId),
            query(
                `SELECT month_key FROM mutabaah_activations WHERE employee_id = $1`,
                [userId]
            ),
            query(
                `SELECT id, book_title, pages_read, date_completed FROM employee_reading_history WHERE employee_id = $1 ORDER BY created_at DESC`,
                [userId]
            ),
            query(
                `SELECT id, date, surah_name, surah_number, start_ayah, end_ayah FROM employee_quran_reading_history WHERE employee_id = $1 ORDER BY date DESC`,
                [userId]
            )
        ]);

        const realActivatedMonths = (activationData || []).map((row: any) => row.month_key);
        const basicEmployeeInCamelCase = convertToCamelCase(employee as any);

        return {
            ...basicEmployeeInCamelCase,
            activatedMonths: realActivatedMonths,
            activated_months: realActivatedMonths,
            monthlyActivities: aggregatedActivities,
            readingHistory: (readingHistoryData || []).map((r: any) => ({
                id: r.id,
                bookTitle: r.book_title,
                pagesRead: r.pages_read,
                dateCompleted: r.date_completed
            })),
            quranReadingHistory: (quranHistoryData || []).map((r: any) => ({
                id: r.id,
                date: r.date,
                surahName: r.surah_name,
                surahNumber: r.surah_number,
                startAyah: r.start_ayah,
                endAyah: r.end_ayah
            })),
            todoList: [],
        };
    } catch (error) {
        console.error('getEssentialEmployeeData error:', error);
        return null;
    }
}
