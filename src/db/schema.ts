import { pgTable, index, foreignKey, pgPolicy, text, bigint, boolean, jsonb, timestamp, unique, check, uuid, integer, date, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const notifications = pgTable("notifications", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: text("user_id").notNull(),
    type: text().notNull(),
    title: text().notNull(),
    message: text().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    timestamp: bigint({ mode: "number" }).notNull(),
    isRead: boolean("is_read").default(false),
    relatedEntityId: text("related_entity_id"),
    linkTo: jsonb("link_to"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    expiresAt: bigint("expires_at", { mode: "number" }),
    dismissOnClick: boolean("dismiss_on_click").default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_notifications_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
    index("idx_notifications_timestamp").using("btree", table.timestamp.desc().nullsFirst().op("int8_ops")),
    index("idx_notifications_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.userId],
        foreignColumns: [employees.id],
        name: "notifications_user_id_fkey"
    }).onDelete("cascade"),
    pgPolicy("Allow all inserts on notifications", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true` }),
    pgPolicy("Allow all selects on notifications", { as: "permissive", for: "select", to: ["public"] }),
]);

export const auditLogs = pgTable("audit_logs", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    timestamp: bigint({ mode: "number" }).notNull(),
    adminId: text("admin_id").notNull(),
    adminName: text("admin_name").notNull(),
    action: text().notNull(),
    target: text().notNull(),
    reason: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_audit_logs_admin").using("btree", table.adminId.asc().nullsLast().op("text_ops")),
    index("idx_audit_logs_timestamp").using("btree", table.timestamp.desc().nullsFirst().op("int8_ops")),
    foreignKey({
        columns: [table.adminId],
        foreignColumns: [employees.id],
        name: "audit_logs_admin_id_fkey"
    }).onDelete("set null"),
]);

export const appSettings = pgTable("app_settings", {
    key: text().primaryKey().notNull(),
    value: text().notNull(),
    description: text(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedBy: text("updated_by"),
});

export const activityAttendance = pgTable("activity_attendance", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    activityId: text("activity_id").notNull(),
    employeeId: text("employee_id").notNull(),
    status: text().notNull(),
    reason: text(),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    isLateEntry: boolean("is_late_entry").default(false),
    notes: text(),
    hospitalId: text("hospital_id"), // 🔥 NEW: Denormalized for faster admin filtering
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_activity_attendance_hospital").using("btree", table.hospitalId.asc().nullsLast().op("text_ops")),
    index("idx_activity_attendance_activity_id").using("btree", table.activityId.asc().nullsLast().op("text_ops")),
    index("idx_activity_attendance_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.activityId],
        foreignColumns: [activities.id],
        name: "activity_attendance_activity_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "activity_attendance_employee_id_fkey"
    }).onDelete("cascade"),
    unique("activity_attendance_unique").on(table.activityId, table.employeeId),
    check("activity_attendance_status_check", sql`status = ANY (ARRAY['hadir'::text, 'tidak-hadir'::text, 'izin'::text, 'sakit'::text])`),
]);

export const attendanceRecords = pgTable("attendance_records", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    entityId: text("entity_id").notNull(),
    status: text().notNull(),
    reason: text(),
    timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    isLateEntry: boolean("is_late_entry").default(false),
    location: text(),
    hospitalId: text("hospital_id"), // 🔥 NEW: Denormalized for faster admin filtering
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_attendance_hospital").using("btree", table.hospitalId.asc().nullsLast().op("text_ops")),
    index("attendance_records_employee_id_idx").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    index("attendance_records_entity_id_idx").using("btree", table.entityId.asc().nullsLast().op("text_ops")),
    index("attendance_records_timestamp_idx").using("btree", table.timestamp.desc().nullsFirst().op("timestamptz_ops")),
    index("idx_attendance_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
    unique("attendance_records_employee_entity").on(table.employeeId, table.entityId),
    check("attendance_records_entity_id_format_check", sql`entity_id !~~ 'team-%'::text`),
    check("attendance_records_status_check", sql`status = ANY (ARRAY['hadir'::text, 'tidak-hadir'::text])`),
]);

export const attendanceHistory = pgTable("attendance_history", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    date: text().notNull(),
    attendanceData: jsonb("attendance_data").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_attendance_history_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
    index("idx_attendance_history_employee").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "attendance_history_employee_id_fkey"
    }).onDelete("cascade"),
]);

export const attendances = pgTable("attendances", {
    employeeId: text("employee_id").primaryKey().notNull(),
    attendanceData: jsonb("attendance_data").default({}).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "attendances_employee_id_fkey"
    }).onDelete("cascade"),
]);

export const activities = pgTable("activities", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    date: text().notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    createdBy: text("created_by").notNull(),
    createdByName: text("created_by_name").notNull(),
    participantIds: text("participant_ids").array().default([""]),
    zoomUrl: text("zoom_url"),
    youtubeUrl: text("youtube_url"),
    activityType: text("activity_type"),
    status: text().default('scheduled'),
    audienceType: text("audience_type").notNull(),
    audienceRules: jsonb("audience_rules"),
    attendanceMode: text("attendance_mode").default('self'),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_activities_created_by").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
    index("idx_activities_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
    index("idx_activities_date_status").using("btree", table.date.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
    index("idx_activities_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    index("idx_activities_type").using("btree", table.activityType.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.createdBy],
        foreignColumns: [employees.id],
        name: "activities_created_by_fkey"
    }).onDelete("cascade"),
    pgPolicy("Activities: Delete all", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
    pgPolicy("Activities: Insert all", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("Activities: Select all", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("Activities: Update all", { as: "permissive", for: "update", to: ["public"] }),
    check("activities_activity_type_check", sql`activity_type = ANY (ARRAY['Umum'::text, 'Kajian Selasa'::text, 'Pengajian Persyarikatan'::text])`),
    check("activities_audience_type_check", sql`audience_type = ANY (ARRAY['public'::text, 'rules'::text, 'manual'::text])`),
    check("activities_status_check", sql`status = ANY (ARRAY['scheduled'::text, 'postponed'::text, 'cancelled'::text])`),
]);

export const announcements = pgTable("announcements", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    title: text().notNull(),
    content: text().notNull(),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    timestamp: bigint({ mode: "number" }).notNull(),
    scope: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    targetHospitalId: text("target_hospital_id"),
    targetHospitalName: text("target_hospital_name"),
    targetHospitalIds: text("target_hospital_ids").array(),
    targetHospitalNames: text("target_hospital_names").array(),
    imageUrl: text("image_url"),
    documentUrl: text("document_url"),
    documentName: text("document_name"),
}, (table) => [
    index("idx_announcements_scope").using("btree", table.scope.asc().nullsLast().op("text_ops")),
    index("idx_announcements_target_hospital").using("btree", table.targetHospitalId.asc().nullsLast().op("text_ops")),
    index("idx_announcements_target_hospital_ids").using("gin", table.targetHospitalIds.asc().nullsLast().op("array_ops")),
    index("idx_announcements_timestamp").using("btree", table.timestamp.desc().nullsFirst().op("int8_ops")),
    foreignKey({
        columns: [table.authorId],
        foreignColumns: [employees.id],
        name: "announcements_author_id_fkey"
    }).onDelete("cascade"),
    check("announcements_scope_check", sql`scope = ANY (ARRAY['alliansi'::text, 'mentor'::text, 'global'::text])`),
]);

export const employeeQuranHistory = pgTable("employee_quran_history", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id"),
    dimension: text().notNull(),
    fromLevel: text("from_level"),
    toLevel: text("to_level").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_history_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "employee_quran_history_employee_id_fkey"
    }).onDelete("cascade"),
    pgPolicy("Admins can manage history", {
        as: "permissive", for: "all", to: ["public"], using: sql`((auth.uid())::text IN ( SELECT employees.id
   FROM employees
  WHERE (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))` }),
    pgPolicy("Everyone can read history", { as: "permissive", for: "select", to: ["public"] }),
]);



export const employeeMonthlyRecords = pgTable("employee_monthly_records", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    monthKey: text("month_key").notNull(), // Format: "YYYY-MM"
    reportData: jsonb("report_data").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    unique("employee_monthly_records_unique_month").on(table.employeeId, table.monthKey),
    index("idx_emr_employee_month").using("btree", table.employeeId.asc(), table.monthKey.desc()),
    index("idx_emr_report_data").using("gin", table.reportData),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "employee_monthly_records_employee_id_fkey"
    }).onDelete("cascade"),
    pgPolicy("Admins manage all records", {
        as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
    FROM employees
    WHERE ((employees.id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text])))))` }),
    pgPolicy("Allow everyone to view/edit their own records", { as: "permissive", for: "all", to: ["public"] }),
]);

export const jobStructure = pgTable("job_structure", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    professionCategory: text("profession_category").notNull(),
    unit: text().notNull(),
    bagians: jsonb().default([]),
    professions: text().array().default([""]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_job_structure_category").using("btree", table.professionCategory.asc().nullsLast().op("text_ops")),
    index("idx_job_structure_unit").using("btree", table.unit.asc().nullsLast().op("text_ops")),
    pgPolicy("Admin insert access for job structure", {
        as: "permissive", for: "insert", to: ["public"], withCheck: sql`(EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['super-admin'::text, 'admin'::text])))))`  }),
    pgPolicy("Admin update access for job structure", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("Public read access for job structure", { as: "permissive", for: "select", to: ["public"] }),
    check("job_structure_profession_category_check", sql`profession_category = ANY (ARRAY['MEDIS'::text, 'NON MEDIS'::text])`),
]);

export const employeeQuranCompetency = pgTable("employee_quran_competency", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id"),
    readingLevel: text("reading_level"),
    tajwidLevel: text("tajwid_level"),
    memorizationLevel: text("memorization_level"),
    understandingLevel: text("understanding_level"),
    readingChecklist: jsonb("reading_checklist").default([]),
    tajwidChecklist: jsonb("tajwid_checklist").default([]),
    memorizationChecklist: jsonb("memorization_checklist").default([]),
    understandingChecklist: jsonb("understanding_checklist").default([]),
    assessedAt: timestamp("assessed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    assessorId: text("assessor_id"),
    notes: text(),
}, (table) => [
    index("idx_competency_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.assessorId],
        foreignColumns: [employees.id],
        name: "employee_quran_competency_assessor_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "employee_quran_competency_employee_id_fkey"
    }).onDelete("cascade"),
    unique("employee_quran_competency_employee_id_key").on(table.employeeId),
    pgPolicy("Admins can manage all competency", {
        as: "permissive", for: "all", to: ["public"], using: sql`((auth.uid())::text IN ( SELECT employees.id
   FROM employees
  WHERE (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))` }),
    pgPolicy("Assessors can update competency", { as: "permissive", for: "all", to: ["public"] }),
    pgPolicy("Public Access", { as: "permissive", for: "all", to: ["public"] }),
    pgPolicy("Superiors can read subordinate competency", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("Users can read own competency", { as: "permissive", for: "select", to: ["public"] }),
]);

export const hospitals = pgTable("hospitals", {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    brand: text().notNull(),
    address: text().notNull(),
    logo: text(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_hospitals_brand").using("btree", table.brand.asc().nullsLast().op("text_ops")),
    index("idx_hospitals_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);

export const employeeQuranReadingHistory = pgTable("employee_quran_reading_history", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    date: text().notNull(),
    surahName: text("surah_name").notNull(),
    surahNumber: integer("surah_number").notNull(),
    startAyah: integer("start_ayah").notNull(),
    endAyah: integer("end_ayah").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_employee_quran_reading_history_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    index("idx_quran_reading_history_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "fk_quran_reading_history_employee"
    }).onDelete("cascade"),
]);

export const employeeReadingHistory = pgTable("employee_reading_history", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    bookTitle: text("book_title").notNull(),
    pagesRead: text("pages_read"),
    dateCompleted: text("date_completed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_employee_reading_history_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    index("idx_reading_history_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "fk_reading_history_employee"
    }).onDelete("cascade"),
]);

export const employees = pgTable("employees", {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    password: text().notNull(),
    name: text().notNull(),
    hospitalId: text("hospital_id"),
    unit: text().notNull(),
    bagian: text().notNull(),
    professionCategory: text("profession_category").notNull(),
    profession: text().notNull(),
    gender: text().notNull(),
    lastVisitDate: text("last_visit_date"),
    role: text().notNull(),
    isActive: boolean("is_active").default(true),
    notificationEnabled: boolean("notification_enabled").default(true),
    profilePicture: text("profile_picture"),
    kaUnitId: text("ka_unit_id"),
    mentorId: text("mentor_id"),
    supervisorId: text("supervisor_id"),
    managerId: text("manager_id"),
    dirutId: text("dirut_id"),
    canBeMentor: boolean("can_be_mentor").default(false),
    canBeSupervisor: boolean("can_be_supervisor").default(false),
    canBeManager: boolean("can_be_manager").default(false),
    canBeKaUnit: boolean("can_be_ka_unit").default(false),
    canBeDirut: boolean("can_be_dirut").default(false),
    canBeDireksi: boolean("can_be_direksi").default(false),
    canBeBPH: boolean("can_be_bph").default(false),
    bphId: text("bph_id"),
    direksiId: text("direksi_id"),
    functionalRoles: text("functional_roles").array().default([""]),
    managerScope: jsonb("manager_scope"),
    signature: text(),
    achievements: jsonb().default([]),
    mustChangePassword: boolean("must_change_password").default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    isProfileComplete: boolean("is_profile_complete").default(false),
    emailVerified: boolean("email_verified").default(false),
    authUserId: text("auth_user_id"),
    managedHospitalIds: text("managed_hospital_ids").array().default([""]),
    nik: text("nik"),
    phoneNumber: text("phone_number"),
    address: text("address"),
    employmentStatus: text("employment_status"),
    birthPlace: text("birth_place"),
    birthDate: text("birth_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    lastAnnouncementReadTimestamp: bigint("last_announcement_read_timestamp", { mode: "number" }),
}, (table) => [
    index("idx_emails").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("idx_employees_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("text_ops")),
    index("idx_employees_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("idx_employees_hospital").using("btree", table.hospitalId.asc().nullsLast().op("text_ops")),
    index("idx_employees_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
    index("idx_employees_is_profile_complete").using("btree", table.isProfileComplete.asc().nullsLast().op("bool_ops")),
    index("idx_employees_ka_unit_id").using("btree", table.kaUnitId.asc().nullsLast().op("text_ops")),
    index("idx_employees_manager_scope").using("gin", table.managerScope.asc().nullsLast().op("jsonb_ops")),
    index("idx_employees_role").using("btree", table.role.asc().nullsLast().op("text_ops")),
    index("idx_employees_unit").using("btree", table.unit.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.dirutId],
        foreignColumns: [table.id],
        name: "employees_dirut_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.bphId],
        foreignColumns: [table.id],
        name: "employees_bph_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.direksiId],
        foreignColumns: [table.id],
        name: "employees_direksi_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.kaUnitId],
        foreignColumns: [table.id],
        name: "employees_ka_unit_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [table.id],
        name: "employees_mentor_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.supervisorId],
        foreignColumns: [table.id],
        name: "employees_supervisor_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.managerId],
        foreignColumns: [table.id],
        name: "employees_manager_id_fkey"
    }).onDelete("set null"),
    unique("employees_email_key").on(table.email),
    pgPolicy("Allow login authentication", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
    pgPolicy("Allow profile updates (trigger-protected)", { as: "permissive", for: "update", to: ["public"] }),
    check("employees_gender_check", sql`gender = ANY (ARRAY['Laki-laki'::text, 'Perempuan'::text])`),
    check("employees_profession_category_check", sql`profession_category = ANY (ARRAY['MEDIS'::text, 'NON MEDIS'::text])`),
    check("employees_role_check", sql`role = ANY (ARRAY['owner'::text, 'super-admin'::text, 'admin'::text, 'user'::text])`),
]);

export const employeeTodos = pgTable("employee_todos", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    title: text().notNull(),
    description: text(),
    isCompleted: boolean("is_completed").default(false),
    dueDate: date("due_date"),
    priority: text().default('medium'),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
    index("idx_employee_todos_due_date").using("btree", table.dueDate.asc().nullsLast().op("date_ops")),
    index("idx_employee_todos_employee_id").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
    index("idx_employee_todos_is_completed").using("btree", table.isCompleted.asc().nullsLast().op("bool_ops")),
]);

export const menteeTargets = pgTable("mentee_targets", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    mentorId: text("mentor_id").notNull(),
    menteeId: text("mentee_id").notNull(),
    title: text().notNull(),
    description: text(),
    monthKey: text("month_key").notNull(),
    status: text().default('in-progress'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    completedAt: bigint("completed_at", { mode: "number" }),
}, (table) => [
    index("idx_targets_mentee").using("btree", table.menteeId.asc().nullsLast().op("text_ops")),
    index("idx_targets_month").using("btree", table.monthKey.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.menteeId],
        foreignColumns: [employees.id],
        name: "mentee_targets_mentee_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [employees.id],
        name: "mentee_targets_mentor_id_fkey"
    }).onDelete("cascade"),
    check("mentee_targets_status_check", sql`status = ANY (ARRAY['in-progress'::text, 'completed'::text])`),
]);

export const employeeMonthlyActivitiesAudit = pgTable("employee_monthly_activities_audit", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    activitiesSnapshot: jsonb("activities_snapshot").notNull(),
    monthKey: text("month_key"),
    changedDay: text("changed_day"),
    activityIdChanged: text("activity_id_changed"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    changeType: text("change_type").notNull(),
    changedBy: text("changed_by"),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    source: text(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    notes: text(),
}, (table) => [
    index("idx_employee_monthly_activities_audit_changed_at").using("btree", table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
    index("idx_employee_monthly_activities_audit_employee_id").using("btree", table.employeeId.desc().nullsFirst().op("text_ops")),
    index("idx_employee_monthly_activities_audit_employee_month").using("btree", table.employeeId.asc().nullsLast().op("text_ops"), table.monthKey.asc().nullsLast().op("text_ops")),
    index("idx_employee_monthly_activities_audit_month_key").using("btree", table.monthKey.asc().nullsLast().op("text_ops")),
    pgPolicy("Allow admins to view all audits", {
        as: "permissive", for: "select", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = employee_monthly_activities_audit.employee_id) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text])))))` }),
    pgPolicy("Allow employees to view own audit", { as: "permissive", for: "select", to: ["public"] }),
    check("employee_monthly_activities_audit_change_type_check", sql`change_type = ANY (ARRAY['INITIAL'::text, 'DAILY_UPDATE'::text, 'FULL_SAVE'::text, 'MERGE'::text])`),
]);

export const dailyActivities = pgTable("daily_activities", {
    id: text().primaryKey().notNull(),
    category: text().notNull(),
    title: text().notNull(),
    monthlyTarget: integer("monthly_target").notNull(),
    automationTrigger: jsonb("automation_trigger"),
}, (table) => [
    check("daily_activities_category_check", sql`category = ANY (ARRAY['SIDIQ (Integritas)'::text, 'TABLIGH (Teamwork)'::text, 'AMANAH (Disiplin)'::text, 'FATONAH (Belajar)'::text])`),
]);

export const documentSubmissions = pgTable("document_submissions", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    menteeId: text("mentee_id").notNull(),
    menteeName: text("mentee_name").notNull(),
    mentorId: text("mentor_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    submittedAt: bigint("submitted_at", { mode: "number" }).notNull(),
    status: text().notNull(),
    documentName: text("document_name").notNull(),
    documentUrl: text("document_url").notNull(),
    notes: text(),
    mentorNotes: text("mentor_notes"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    reviewedAt: bigint("reviewed_at", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    foreignKey({
        columns: [table.menteeId],
        foreignColumns: [employees.id],
        name: "document_submissions_mentee_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [employees.id],
        name: "document_submissions_mentor_id_fkey"
    }).onDelete("cascade"),
    check("document_submissions_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
]);

export const missedPrayerRequests = pgTable("missed_prayer_requests", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    menteeId: text("mentee_id").notNull(),
    menteeName: text("mentee_name").notNull(),
    mentorId: text("mentor_id").notNull(),
    date: text().notNull(),
    prayerId: text("prayer_id").notNull(),
    prayerName: text("prayer_name").notNull(),
    reason: text().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
    status: text().default('pending'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    reviewedAt: bigint("reviewed_at", { mode: "number" }),
    mentorNotes: text("mentor_notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_missed_prayer_mentee_id").using("btree", table.menteeId.asc()),
    index("idx_missed_prayer_status").using("btree", table.status.asc()),
    index("idx_missed_prayer_requested_at").using("btree", table.requestedAt.desc()),
    foreignKey({
        columns: [table.menteeId],
        foreignColumns: [employees.id],
        name: "missed_prayer_requests_mentee_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [employees.id],
        name: "missed_prayer_requests_mentor_id_fkey"
    }).onDelete("cascade"),
    check("missed_prayer_requests_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
]);

export const sunnahIbadah = pgTable("sunnah_ibadah", {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    type: text(),
    icon: text().notNull(),
    scheduleType: text("schedule_type"),
    daysOfWeek: integer("days_of_week").array().default([]),
    date: text(),
    startTime: text("start_time"),
    endTime: text("end_time"),
    createdBy: text("created_by").notNull(),
    createdByName: text("created_by_name").notNull(),
}, (table) => [
    check("sunnah_ibadah_schedule_type_check", sql`schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'one-time'::text])`),
    check("sunnah_ibadah_type_check", sql`type = ANY (ARRAY['sholat'::text, 'puasa'::text])`),
]);

export const quranReadingSubmissions = pgTable("quran_reading_submissions", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: text("user_id").notNull(),
    surahNumber: integer("surah_number").notNull(),
    surahName: text("surah_name").notNull(),
    startAyah: integer("start_ayah").notNull(),
    endAyah: integer("end_ayah").notNull(),
    submissionDate: text("submission_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_quran_reading_date").using("btree", table.submissionDate.asc().nullsLast().op("text_ops")),
    index("idx_quran_reading_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    index("idx_quran_submissions_date").using("btree", table.submissionDate.asc().nullsLast().op("text_ops")),
    index("idx_quran_submissions_user_date").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.submissionDate.asc().nullsLast().op("text_ops")),
    index("idx_quran_submissions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.userId],
        foreignColumns: [employees.id],
        name: "quran_reading_submissions_user_id_fkey"
    }).onDelete("cascade"),
    pgPolicy("Users can delete own submissions", { as: "permissive", for: "delete", to: ["public"], using: sql`((auth.uid())::text = user_id)` }),
    pgPolicy("Users can delete own Quran submissions", { as: "permissive", for: "delete", to: ["public"] }),
    pgPolicy("Users can insert own Quran submissions", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("Users can insert own submissions", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("Users can update own Quran submissions", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("Users can update own submissions", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("Users can view own Quran submissions", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("Users can view own submissions", { as: "permissive", for: "select", to: ["public"] }),
]);

export const tadarusSessions = pgTable("tadarus_sessions", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    title: text().notNull(),
    date: text().notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    category: text(),
    notes: text(),
    isRecurring: boolean("is_recurring").default(false),
    mentorId: text("mentor_id").notNull(),
    participantIds: text("participant_ids").array().default([""]),
    presentMenteeIds: text("present_mentee_ids").array().default([""]),
    status: text().default('open'),
    mentorPresent: boolean("mentor_present").default(false),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
    index("idx_tadarus_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
    index("idx_tadarus_mentor").using("btree", table.mentorId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [employees.id],
        name: "tadarus_sessions_mentor_id_fkey"
    }).onDelete("cascade"),
    check("tadarus_sessions_category_check", sql`category = ANY (ARRAY['UMUM'::text, 'BBQ'::text])`),
    check("tadarus_sessions_status_check", sql`status = ANY (ARRAY['open'::text, 'closed'::text])`),
]);

export const sunnahIbadahConfig = pgTable("sunnah_ibadah_config", {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    type: text().notNull(),
    icon: text(),
    scheduleType: text("schedule_type").notNull(),
    daysOfWeek: integer("days_of_week").array(),
    date: text(),
    createdBy: text("created_by").notNull(),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_sunnah_ibadah_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
    index("idx_sunnah_ibadah_schedule_type").using("btree", table.scheduleType.asc().nullsLast().op("text_ops")),
    check("sunnah_ibadah_config_schedule_type_check", sql`schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'one-time'::text])`),
    check("sunnah_ibadah_config_type_check", sql`type = ANY (ARRAY['sholat'::text, 'puasa'::text, 'lainnya'::text])`),
]);

export const tadarusRequests = pgTable("tadarus_requests", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    menteeId: text("mentee_id").notNull(),
    menteeName: text("mentee_name").notNull(),
    mentorId: text("mentor_id").notNull(),
    date: text().notNull(),
    notes: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
    status: text().default('pending'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    reviewedAt: bigint("reviewed_at", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    category: text(),
}, (table) => [
    index("idx_tadarus_requests_mentee_id").using("btree", table.menteeId.asc()),
    index("idx_tadarus_requests_status").using("btree", table.status.asc()),
    index("idx_tadarus_requests_requested_at").using("btree", table.requestedAt.desc()),
    foreignKey({
        columns: [table.menteeId],
        foreignColumns: [employees.id],
        name: "tadarus_requests_mentee_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [employees.id],
        name: "tadarus_requests_mentor_id_fkey"
    }).onDelete("cascade"),
    check("tadarus_requests_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
]);

export const teamAttendanceSessions = pgTable("team_attendance_sessions", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    creatorId: text("creator_id").notNull(),
    creatorName: text("creator_name").notNull(),
    type: text().notNull(),
    date: text().notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    audienceType: text("audience_type").notNull(),
    audienceRules: jsonb("audience_rules"),
    manualParticipantIds: text("manual_participant_ids").array().default([""]),
    attendanceMode: text("attendance_mode"),
    zoomUrl: text("zoom_url"),
    youtubeUrl: text("youtube_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    status: text().default('scheduled'),
}, (table) => [
    index("idx_team_attendance_sessions_creator").using("btree", table.creatorId.asc().nullsLast().op("text_ops")),
    index("idx_team_attendance_sessions_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
    index("idx_team_attendance_sessions_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
    pgPolicy("TeamSessions: Delete all", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
    pgPolicy("TeamSessions: Insert all", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("TeamSessions: Select all", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("TeamSessions: Update all", { as: "permissive", for: "update", to: ["public"] }),
    check("team_attendance_sessions_attendance_mode_check", sql`attendance_mode = ANY (ARRAY['leader'::text, 'self'::text])`),
    check("team_attendance_sessions_audience_type_check", sql`audience_type = ANY (ARRAY['public'::text, 'rules'::text, 'manual'::text])`),
    check("team_attendance_sessions_status_check", sql`status = ANY (ARRAY['scheduled'::text, 'postponed'::text, 'cancelled'::text])`),
    check("team_attendance_sessions_type_check", sql`type = ANY (ARRAY['KIE'::text, 'Doa Bersama'::text, 'BBQ'::text, 'UMUM'::text])`),
]);

export const mutabaahActivations = pgTable("mutabaah_activations", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    employeeId: text("employee_id").notNull(),
    monthKey: text("month_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
    foreignKey({
        columns: [table.employeeId],
        foreignColumns: [employees.id],
        name: "mutabaah_activations_employee_id_fkey"
    }).onDelete("cascade"),
    unique("mutabaah_activations_employee_id_month_key_key").on(table.employeeId, table.monthKey),
    pgPolicy("Admins can manage activations", {
        as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.auth_user_id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text])))))` }),
    pgPolicy("Admins can view all activations", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("Users can insert their own activations", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("Users can view their own activations", { as: "permissive", for: "select", to: ["public"] }),
]);

export const teamAttendanceRecords = pgTable("team_attendance_records", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sessionId: uuid("session_id").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    attendedAt: timestamp("attended_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    sessionType: text("session_type").notNull(),
    sessionDate: text("session_date").notNull(),
    sessionStartTime: text("session_start_time").notNull(),
    sessionEndTime: text("session_end_time").notNull(),
    hospitalId: text("hospital_id"), // 🔥 NEW: Denormalized for faster admin filtering
}, (table) => [
    index("idx_team_attendance_hospital").using("btree", table.hospitalId.asc().nullsLast().op("text_ops")),
    index("idx_team_attendance_records_attended_at").using("btree", table.attendedAt.asc().nullsLast().op("timestamptz_ops")),
    index("idx_team_attendance_records_date").using("btree", table.sessionDate.asc().nullsLast().op("text_ops")),
    index("idx_team_attendance_records_session_id").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
    index("idx_team_attendance_records_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.sessionId],
        foreignColumns: [teamAttendanceSessions.id],
        name: "team_attendance_records_session_exists"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.sessionId],
        foreignColumns: [teamAttendanceSessions.id],
        name: "team_attendance_records_session_id_fkey"
    }).onDelete("cascade"),
    unique("team_attendance_records_session_user_unique").on(table.sessionId, table.userId),
    pgPolicy("Employees can view attendance records", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
    pgPolicy("Only session creators can delete attendance records", { as: "permissive", for: "delete", to: ["public"] }),
    pgPolicy("Only session creators can update attendance records", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("Users can insert own attendance, creators can insert for their ", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const quranLevels = pgTable("quran_levels", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    dimension: text().notNull(),
    code: text().notNull(),
    label: text().notNull(),
    order: integer().notNull(),
}, (table) => [
    unique("quran_levels_dimension_code_key").on(table.code, table.dimension),
    pgPolicy("Allow public read on quran_levels", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
    pgPolicy("Public Access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const monthlyReportSubmissions = pgTable("monthly_report_submissions", {
    id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    menteeId: text("mentee_id").notNull(),
    menteeName: text("mentee_name").notNull(),
    monthKey: text("month_key").notNull(),
    weekIndex: integer("week_index").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    submittedAt: bigint("submitted_at", { mode: "number" }).notNull(),
    status: text().notNull(),
    mentorId: text("mentor_id").notNull(),
    supervisorId: text("supervisor_id"),
    kaUnitId: text("ka_unit_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    mentorReviewedAt: bigint("mentor_reviewed_at", { mode: "number" }),
    mentorNotes: text("mentor_notes"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    supervisorReviewedAt: bigint("supervisor_reviewed_at", { mode: "number" }),
    supervisorNotes: text("supervisor_notes"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    kaUnitReviewedAt: bigint("ka_unit_reviewed_at", { mode: "number" }),
    kaUnitNotes: text("ka_unit_notes"),
    managerId: text("manager_id"),
    managerReviewedAt: bigint("manager_reviewed_at", { mode: "number" }),
    managerNotes: text("manager_notes"),
    dirutId: text("dirut_id"),
    dirutReviewedAt: bigint("dirut_reviewed_at", { mode: "number" }),
    dirutNotes: text("dirut_notes"),
    direksiId: text("direksi_id"),
    direksiReviewedAt: bigint("direksi_reviewed_at", { mode: "number" }),
    direksiNotes: text("direksi_notes"),
    bphId: text("bph_id"),
    bphReviewedAt: bigint("bph_reviewed_at", { mode: "number" }),
    bphNotes: text("bph_notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    reports: jsonb().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    index("idx_reports_mentee").using("btree", table.menteeId.asc().nullsLast().op("text_ops")),
    index("idx_reports_month").using("btree", table.monthKey.asc().nullsLast().op("text_ops")),
    index("idx_reports_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    foreignKey({
        columns: [table.kaUnitId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_ka_unit_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.menteeId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_mentee_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.mentorId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_mentor_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.supervisorId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_supervisor_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.managerId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_manager_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.dirutId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_dirut_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.direksiId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_direksi_id_fkey"
    }).onDelete("set null"),
    foreignKey({
        columns: [table.bphId],
        foreignColumns: [employees.id],
        name: "weekly_report_submissions_bph_id_fkey"
    }).onDelete("set null"),
    unique("unique_monthly_submission").on(table.menteeId, table.monthKey, table.weekIndex),
    check("weekly_report_submissions_status_check", sql`status IN ('pending_mentor', 'pending_kaunit', 'partially_approved', 'approved', 'rejected_mentor', 'rejected_kaunit')`),
]);

export const bookmarks = pgTable("bookmarks", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    surahNumber: integer("surah_number").notNull(),
    surahName: text("surah_name").notNull(),
    ayahNumber: integer("ayah_number").notNull(),
    ayahText: text("ayah_text"),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    index("idx_bookmarks_surah_ayah").using("btree", table.surahNumber.asc().nullsLast().op("int4_ops"), table.ayahNumber.asc().nullsLast().op("int4_ops")),
    index("idx_bookmarks_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
    unique("bookmarks_user_id_surah_number_ayah_number_key").on(table.ayahNumber, table.surahNumber, table.userId),
    pgPolicy("Users can delete own bookmarks", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
    pgPolicy("Users can insert own bookmarks", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("Users can update own bookmarks", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("Users can view own bookmarks", { as: "permissive", for: "select", to: ["public"] }),
]);

export const attendanceRecordsHistory = pgTable("attendance_records_history", {
    historyId: uuid("history_id").defaultRandom().primaryKey().notNull(),
    recordId: uuid("record_id"),
    employeeId: text("employee_id").notNull(),
    entityId: text("entity_id").notNull(),
    status: text(),
    reason: text(),
    timestamp: timestamp({ withTimezone: true, mode: 'string' }),
    isLateEntry: boolean("is_late_entry"),
    location: text(),
    changeType: text("change_type").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    changedBy: text("changed_by"),
    oldStatus: text("old_status"),
    newStatus: text("new_status"),
});
export const vDailyActivityChanges = pgView("v_daily_activity_changes", {
    employeeId: text("employee_id"),
    changeDate: date("change_date"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalChanges: bigint("total_changes", { mode: "number" }),
    changeTypes: text("change_types"),
    firstChange: timestamp("first_change", { withTimezone: true, mode: 'string' }),
    lastChange: timestamp("last_change", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT employee_id, date(changed_at) AS change_date, count(*) AS total_changes, string_agg(DISTINCT change_type, ', '::text) AS change_types, min(changed_at) AS first_change, max(changed_at) AS last_change FROM employee_monthly_activities_audit GROUP BY employee_id, (date(changed_at)) ORDER BY (date(changed_at)) DESC, employee_id`);

export const vAttendanceChanges = pgView("v_attendance_changes", {
    employeeId: text(),
    entityId: text(),
    date: date(),
    oldStatus: text(),
    newStatus: text(),
    changeType: text(),
    changedAt: timestamp({ withTimezone: true, mode: 'string' }),
    changedBy: text(),
    reason: text(),
    isLateEntry: boolean(),
    changeDescription: text(),
}).as(sql`SELECT employee_id AS "employeeId", entity_id AS "entityId", date("timestamp") AS date, old_status AS "oldStatus", new_status AS "newStatus", change_type AS "changeType", changed_at AS "changedAt", changed_by AS "changedBy", reason, is_late_entry AS "isLateEntry", concat('Status changed from ', COALESCE(old_status, 'empty'::text), ' to ', COALESCE(new_status, 'empty'::text), CASE WHEN reason IS NOT NULL AND reason <> ''::text THEN concat(' (Reason: ', reason, ')') ELSE ''::text END) AS "changeDescription" FROM attendance_records_history h`);