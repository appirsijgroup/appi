/**
 * Attendance Validation Service
 * Mencegah pencampuran data antara prayer attendance dan team attendance
 */


export interface AttendanceValidationResult {
    isValid: boolean;
    error?: string;
    suggestedTable?: 'attendance_records' | 'team_attendance_records' | 'activity_attendance';
}

/**
 * Validate entity_id format untuk menentukan tabel yang correct
 *
 * Rules:
 * - entity_id = "team-*" -> harus ke team_attendance_records
 * - entity_id = "subuh", "dzuhur", "ashar", "maghrib", "isya", "jumat" -> attendance_records
 * - entity_id = UUID (format regular activities) -> activity_attendance
 */
export const validateEntityId = (
    entityId: string
): AttendanceValidationResult => {
    // 1. Cek jika ini team session
    if (entityId.startsWith('team-')) {
        return {
            isValid: false,
            error: `Entity ID "${entityId}" adalah team session. Gunakan team_attendance_records, bukan attendance_records.`,
            suggestedTable: 'team_attendance_records'
        };
    }

    // 2. Cek jika ini prayer attendance
    const validPrayerIds = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya', 'jumat'];
    if (validPrayerIds.includes(entityId)) {
        return {
            isValid: true,
            suggestedTable: 'attendance_records'
        };
    }

    // 3. Jika UUID, kemungkinan ini adalah activity attendance
    // UUID format: 8-4-4-4-12 hexadecimal characters
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(entityId)) {
        return {
            isValid: false, // Tidak valid untuk attendance_records, harus ke activity_attendance
            error: `Entity ID "${entityId}" appears to be an activity. Gunakan activity_attendance, bukan attendance_records.`,
            suggestedTable: 'activity_attendance'
        };
    }

    // 4. Unknown entity_id format - warning but allow
    return {
        isValid: true,
        suggestedTable: 'attendance_records'
    };
};

/**
 * Wrapper untuk submitAttendance dengan validasi
 * Mencegah submit ke tabel yang salah
 */
export const safeSubmitAttendance = async (
    employeeId: string,
    entityId: string,
    status: 'hadir' | 'tidak-hadir',
    reason?: string
): Promise<{ success: boolean; error?: string }> => {
    // 1. Validate entity_id
    const validation = validateEntityId(entityId);

    if (!validation.isValid && validation.suggestedTable !== 'attendance_records') {
        // 2. Jika tidak valid untuk attendance_records, reject
        return {
            success: false,
            error: validation.error
        };
    }

    // 3. Jika valid, lanjutkan dengan submitAttendance biasa
    try {
        const { submitAttendance } = await import('./attendanceService');
        await submitAttendance(employeeId, entityId, status, reason || null);
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Gagal submit attendance'
        };
    }
};
