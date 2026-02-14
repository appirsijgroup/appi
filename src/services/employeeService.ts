import type { Employee, Attendance, Role, MonthlyActivityProgress, ReadingHistory, QuranReadingHistory, FunctionalRole } from '@/types';

/**
 * Employee Service
 * Handles all employee-related data operations via Next.js APIs
 */

// Helper interface for snake_case data coming from DB
export interface RawSqlEmployee {
    id: string;
    name: string;
    email: string;
    role: Role;
    password?: string;
    is_active?: boolean;
    hospital_id?: string;
    unit?: string;
    bagian?: string;
    gender?: 'Laki-laki' | 'Perempuan';
    profession_category?: 'MEDIS' | 'NON MEDIS';
    profession?: string;
    profile_picture?: string;
    avatar_url?: string;
    last_visit_date?: string;
    notification_enabled?: boolean;
    ka_unit_id?: string;
    ka_unit_name?: string;
    mentor_id?: string;
    mentor_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
    manager_id?: string;
    manager_name?: string;
    dirut_id?: string;
    dirut_name?: string;
    can_be_mentor?: boolean;
    can_be_supervisor?: boolean;
    can_be_manager?: boolean;
    can_be_ka_unit?: boolean;
    can_be_dirut?: boolean;
    functional_roles?: FunctionalRole[];
    location_id?: string;
    location_name?: string;
    managed_hospital_ids?: string[];
    must_change_password?: boolean;
    is_profile_complete?: boolean;
    email_verified?: boolean;
    auth_user_id?: string;
    last_announcement_read_timestamp?: string | number | null;
    activated_months?: string[];
    monthly_activities?: Record<string, MonthlyActivityProgress>;
    reading_history_raw?: ReadingHistory[];
    quran_history_raw?: QuranReadingHistory[];
    signature?: string | null;
    achievements?: any[];
    can_be_bph?: boolean;
    can_be_direksi?: boolean;
    bph_id?: string;
    bph_name?: string;
    direksi_id?: string;
    direksi_name?: string;
}

/**
 * Helper function to convert snake_case (DB / API) to camelCase (Frontend)
 */
export const convertToCamelCase = (emp: RawSqlEmployee): Employee => {
    const activatedMonths = emp.activated_months || [];

    const result: Employee = {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        password: emp.password || '',
        role: emp.role,
        lastVisitDate: emp.last_visit_date || '',
        isActive: emp.is_active ?? true,
        notificationEnabled: emp.notification_enabled ?? true,
        profilePicture: emp.profile_picture || emp.avatar_url || null,
        monthlyActivities: emp.monthly_activities || {},
        activatedMonths: activatedMonths,
        readingHistory: emp.reading_history_raw || [],
        quranReadingHistory: emp.quran_history_raw || [],
        kaUnitId: emp.ka_unit_id || null,
        kaUnitName: emp.ka_unit_name || null,
        mentorId: emp.mentor_id || null,
        mentorName: emp.mentor_name || null,
        supervisorId: emp.supervisor_id || null,
        supervisorName: emp.supervisor_name || null,
        managerId: emp.manager_id || null,
        managerName: emp.manager_name || null,
        dirutId: emp.dirut_id || null,
        dirutName: emp.dirut_name || null,
        canBeMentor: emp.can_be_mentor ?? false,
        canBeSupervisor: emp.can_be_supervisor ?? false,
        canBeManager: emp.can_be_manager ?? false,
        canBeKaUnit: emp.can_be_ka_unit ?? false,
        canBeDirut: emp.can_be_dirut ?? false,
        canBeDireksi: emp.can_be_direksi ?? false,
        canBeBPH: emp.can_be_bph ?? false,
        bphId: emp.bph_id || null,
        bphName: emp.bph_name || null,
        direksiId: emp.direksi_id || null,
        direksiName: emp.direksi_name || null,
        functionalRoles: (emp.functional_roles || []) as FunctionalRole[],
        locationId: emp.location_id || undefined,
        locationName: emp.location_name || undefined,
        managedHospitalIds: emp.managed_hospital_ids || [],
        mustChangePassword: emp.must_change_password ?? false,
        hospitalId: emp.hospital_id || '',
        unit: emp.unit || '',
        bagian: emp.bagian || '',
        gender: emp.gender || 'Laki-laki',
        professionCategory: emp.profession_category || 'NON MEDIS',
        profession: emp.profession || '',
        isProfileComplete: emp.is_profile_complete ?? false,
        emailVerified: emp.email_verified ?? false,
        authUserId: emp.auth_user_id || null,
        lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp ? (typeof emp.last_announcement_read_timestamp === 'string' ? new Date(emp.last_announcement_read_timestamp).getTime() : Number(emp.last_announcement_read_timestamp)) : undefined,
    } as Employee;

    return result;
};

export const getAllEmployees = async (limit?: number): Promise<Employee[]> => {
    const url = limit ? `/api/employees?limit=${limit}` : '/api/employees';
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch employees');
    const { employees } = (await response.json()) as { employees: RawSqlEmployee[] };
    return employees.map((emp) => convertToCamelCase(emp));
};

export const getEmployeesByIds = async (ids: string[]): Promise<Employee[]> => {
    if (!ids || ids.length === 0) return [];
    const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch bulk employees');
    const { employees } = (await response.json()) as { employees: RawSqlEmployee[] };
    return employees.map((emp) => convertToCamelCase(emp));
};

export const getEmployeeById = async (id: string): Promise<Employee | null> => {
    const response = await fetch(`/api/employees?id=${id}`, { credentials: 'include' });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch employee');
    }
    const { employees } = (await response.json()) as { employees: RawSqlEmployee[] };
    if (!employees || employees.length === 0) return null;
    return convertToCamelCase(employees[0]);
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
    const response = await fetch(`/api/employees?email=${encodeURIComponent(email)}`, { credentials: 'include' });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch employee by email');
    }
    const { employees } = (await response.json()) as { employees: RawSqlEmployee[] };
    if (!employees || employees.length === 0) return null;
    return convertToCamelCase(employees[0]);
};

export const createEmployee = async (employee: Employee): Promise<Employee> => {
    const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
        credentials: 'include'
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create employee');
    }
    const result = (await response.json()) as { data: RawSqlEmployee };
    return convertToCamelCase(result.data);
};

export const updateEmployee = async (
    id: string,
    updates: Partial<Omit<Employee, 'id'>>
): Promise<Employee> => {

    const dbUpdates: Partial<RawSqlEmployee> & { id: string } = { id };
    const u = updates as any;

    if (u.name !== undefined) dbUpdates.name = u.name;
    if (u.email !== undefined) dbUpdates.email = u.email;
    if (u.password !== undefined) dbUpdates.password = u.password;
    if (u.lastVisitDate !== undefined) dbUpdates.last_visit_date = u.lastVisitDate;
    if (u.role !== undefined) dbUpdates.role = u.role;
    if (u.isActive !== undefined) dbUpdates.is_active = u.isActive;
    if (u.notificationEnabled !== undefined) dbUpdates.notification_enabled = u.notificationEnabled;
    if (u.profilePicture !== undefined) dbUpdates.profile_picture = u.profilePicture;
    if (u.kaUnitId !== undefined) dbUpdates.ka_unit_id = u.kaUnitId;
    if (u.mentorId !== undefined) dbUpdates.mentor_id = u.mentorId;
    if (u.supervisorId !== undefined) dbUpdates.supervisor_id = u.supervisorId;
    if (u.managerId !== undefined) dbUpdates.manager_id = u.managerId;
    if (u.dirutId !== undefined) dbUpdates.dirut_id = u.dirutId;
    if (u.canBeMentor !== undefined) dbUpdates.can_be_mentor = u.canBeMentor;
    if (u.canBeSupervisor !== undefined) dbUpdates.can_be_supervisor = u.canBeSupervisor;
    if (u.canBeManager !== undefined) dbUpdates.can_be_manager = u.canBeManager;
    if (u.canBeKaUnit !== undefined) dbUpdates.can_be_ka_unit = u.canBeKaUnit;
    if (u.canBeDirut !== undefined) dbUpdates.can_be_dirut = u.canBeDirut;
    if (u.canBeDireksi !== undefined) dbUpdates.can_be_direksi = u.canBeDireksi;
    if (u.functionalRoles !== undefined) dbUpdates.functional_roles = u.functionalRoles;
    if (u.canBeBPH !== undefined) dbUpdates.can_be_bph = u.canBeBPH;
    if (u.bphId !== undefined) dbUpdates.bph_id = u.bphId;
    if (u.direksiId !== undefined) dbUpdates.direksi_id = u.direksiId;
    if (u.locationId !== undefined) dbUpdates.location_id = u.locationId;
    if (u.locationName !== undefined) dbUpdates.location_name = u.locationName;
    if (u.signature !== undefined) dbUpdates.signature = u.signature;
    if (u.managedHospitalIds !== undefined) dbUpdates.managed_hospital_ids = (u.managedHospitalIds as string[]).map((h) => h.toUpperCase());
    if (u.achievements !== undefined) dbUpdates.achievements = u.achievements;
    if (u.mustChangePassword !== undefined) dbUpdates.must_change_password = u.mustChangePassword;
    if (u.hospitalId !== undefined) dbUpdates.hospital_id = (u.hospitalId as string).toUpperCase();
    if (u.unit !== undefined) dbUpdates.unit = u.unit;
    if (u.bagian !== undefined) dbUpdates.bagian = u.bagian;
    if (u.professionCategory !== undefined) dbUpdates.profession_category = u.professionCategory;
    if (u.profession !== undefined) dbUpdates.profession = u.profession;
    if (u.gender !== undefined) dbUpdates.gender = u.gender;
    if (u.isProfileComplete !== undefined) dbUpdates.is_profile_complete = u.isProfileComplete;
    if (u.emailVerified !== undefined) dbUpdates.email_verified = u.emailVerified;
    if (u.avatarUrl !== undefined) dbUpdates.avatar_url = u.avatarUrl;
    if (u.authUserId !== undefined) dbUpdates.auth_user_id = u.authUserId;
    if (u.lastAnnouncementReadTimestamp !== undefined) dbUpdates.last_announcement_read_timestamp = u.lastAnnouncementReadTimestamp;
    if (u.nik !== undefined) (dbUpdates as any).nik = u.nik;
    if (u.phoneNumber !== undefined) (dbUpdates as any).phone_number = u.phoneNumber;
    if (u.address !== undefined) (dbUpdates as any).address = u.address;
    if (u.employmentStatus !== undefined) (dbUpdates as any).employment_status = u.employmentStatus;
    if (u.birthPlace !== undefined) (dbUpdates as any).birth_place = u.birthPlace;
    if (u.birthDate !== undefined) (dbUpdates as any).birth_date = u.birthDate;

    if (Object.keys(dbUpdates).length === 0) {
        const current = await getEmployeeById(id);
        if (!current) throw new Error('Employee not found');
        return current;
    }

    const response = await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates),
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update employee: ${errorData.error || response.statusText}`);
    }

    const { data } = (await response.json()) as { data: RawSqlEmployee };
    return convertToCamelCase(data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
    console.warn("Delete Employee fully not implemented yet via API. Soft deleting...");
    await updateEmployee(id, { isActive: false });
};

export const getEmployeeAttendance = async (employeeId: string): Promise<Attendance> => {
    const response = await fetch(`/api/attendance?employeeId=${employeeId}`, { credentials: 'include' });
    if (!response.ok) return {};
    const { attendance } = (await response.json()) as { attendance: Attendance };
    return attendance || {};
};

export const updateEmployeeAttendance = async (
    employeeId: string,
    attendance: Attendance
): Promise<void> => {
    console.warn('updateEmployeeAttendance not fully implemented via API');
};

export const getAttendanceHistory = async (employeeId: string): Promise<Record<string, Attendance>> => {
    const response = await fetch(`/api/attendance?employeeId=${employeeId}&history=true`, { credentials: 'include' });
    if (!response.ok) return {};
    const { history } = (await response.json()) as { history: Record<string, Attendance> };
    return history || {};
};

export const addAttendanceHistory = async (
    employeeId: string,
    date: string,
    attendance: Attendance
): Promise<void> => {
    console.warn('addAttendanceHistory not implemented');
};

export const getEmployeesByRole = async (role: string): Promise<Employee[]> => {
    const all = await getAllEmployees();
    return all.filter(e => e.role === role);
};

export const getEmployeesByHospital = async (hospitalId: string): Promise<Employee[]> => {
    const all = await getAllEmployees();
    return all.filter(e => e.hospitalId === hospitalId);
};

export const getPotentialMentors = async (): Promise<Employee[]> => {
    const all = await getAllEmployees();
    return all.filter(e => e.canBeMentor);
};

export const searchEmployees = async (query: string): Promise<Employee[]> => {
    const all = await getAllEmployees();
    const lower = query.toLowerCase();
    return all.filter(e => e.name.toLowerCase().includes(lower) || e.email.toLowerCase().includes(lower)).slice(0, 50);
};


export const getManagedEmployeeIds = async (superiorId: string): Promise<string[]> => {
    const all = await getAllEmployees();
    return all.filter(e =>
        e.mentorId === superiorId ||
        e.kaUnitId === superiorId ||
        e.managerId === superiorId ||
        e.supervisorId === superiorId ||
        e.direksiId === superiorId ||
        e.bphId === superiorId ||
        e.dirutId === superiorId
    ).map(e => e.id);
};

export const getEmployeesByMentorId = async (mentorId: string): Promise<Employee[]> => {
    const all = await getAllEmployees();
    return all.filter(e => e.mentorId === mentorId);
};
