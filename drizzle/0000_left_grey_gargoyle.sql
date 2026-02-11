-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"is_read" boolean DEFAULT false,
	"related_entity_id" text,
	"link_to" jsonb,
	"expires_at" bigint,
	"dismiss_on_click" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"timestamp" bigint NOT NULL,
	"admin_id" text NOT NULL,
	"admin_name" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activity_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_late_entry" boolean DEFAULT false,
	"notes" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "activity_attendance_unique" UNIQUE("activity_id","employee_id"),
	CONSTRAINT "activity_attendance_status_check" CHECK (status = ANY (ARRAY['hadir'::text, 'tidak-hadir'::text, 'izin'::text, 'sakit'::text]))
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"timestamp" timestamp with time zone NOT NULL,
	"is_late_entry" boolean DEFAULT false,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "attendance_records_employee_entity" UNIQUE("employee_id","entity_id"),
	CONSTRAINT "attendance_records_entity_id_format_check" CHECK (entity_id !~~ 'team-%'::text),
	CONSTRAINT "attendance_records_status_check" CHECK (status = ANY (ARRAY['hadir'::text, 'tidak-hadir'::text]))
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_history" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"attendance_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendances" (
	"employee_id" text PRIMARY KEY NOT NULL,
	"attendance_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	"participant_ids" text[] DEFAULT '{""}',
	"zoom_url" text,
	"youtube_url" text,
	"activity_type" text,
	"status" text DEFAULT 'scheduled',
	"audience_type" text NOT NULL,
	"audience_rules" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "activities_activity_type_check" CHECK (activity_type = ANY (ARRAY['Umum'::text, 'Kajian Selasa'::text, 'Pengajian Persyarikatan'::text])),
	CONSTRAINT "activities_audience_type_check" CHECK (audience_type = ANY (ARRAY['public'::text, 'rules'::text, 'manual'::text])),
	CONSTRAINT "activities_status_check" CHECK (status = ANY (ARRAY['scheduled'::text, 'postponed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"target_hospital_id" text,
	"target_hospital_name" text,
	"target_hospital_ids" text[],
	"target_hospital_names" text[],
	"image_url" text,
	"document_url" text,
	"document_name" text,
	CONSTRAINT "announcements_scope_check" CHECK (scope = ANY (ARRAY['alliansi'::text, 'mentor'::text, 'global'::text]))
);
--> statement-breakpoint
CREATE TABLE "employee_quran_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text,
	"dimension" text NOT NULL,
	"from_level" text,
	"to_level" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employee_quran_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employee_monthly_reports" (
	"employee_id" text PRIMARY KEY NOT NULL,
	"reports" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employee_monthly_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_structure" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"profession_category" text NOT NULL,
	"unit" text NOT NULL,
	"bagians" jsonb DEFAULT '[]'::jsonb,
	"professions" text[] DEFAULT '{""}',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "job_structure_profession_category_check" CHECK (profession_category = ANY (ARRAY['MEDIS'::text, 'NON MEDIS'::text]))
);
--> statement-breakpoint
ALTER TABLE "job_structure" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employee_quran_competency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text,
	"reading_level" text,
	"tajwid_level" text,
	"memorization_level" text,
	"understanding_level" text,
	"reading_checklist" jsonb DEFAULT '[]'::jsonb,
	"tajwid_checklist" jsonb DEFAULT '[]'::jsonb,
	"memorization_checklist" jsonb DEFAULT '[]'::jsonb,
	"understanding_checklist" jsonb DEFAULT '[]'::jsonb,
	"assessed_at" timestamp with time zone DEFAULT now(),
	"assessor_id" text,
	"notes" text,
	CONSTRAINT "employee_quran_competency_employee_id_key" UNIQUE("employee_id")
);
--> statement-breakpoint
ALTER TABLE "employee_quran_competency" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"address" text NOT NULL,
	"logo" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hospitals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employee_quran_reading_history" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"surah_name" text NOT NULL,
	"surah_number" integer NOT NULL,
	"start_ayah" integer NOT NULL,
	"end_ayah" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_reading_history" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"employee_id" text NOT NULL,
	"book_title" text NOT NULL,
	"pages_read" text,
	"date_completed" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"hospital_id" text,
	"unit" text NOT NULL,
	"bagian" text NOT NULL,
	"profession_category" text NOT NULL,
	"profession" text NOT NULL,
	"gender" text NOT NULL,
	"last_visit_date" text,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"notification_enabled" boolean DEFAULT true,
	"profile_picture" text,
	"ka_unit_id" text,
	"supervisor_id" text,
	"mentor_id" text,
	"dirut_id" text,
	"can_be_mentor" boolean DEFAULT false,
	"can_be_supervisor" boolean DEFAULT false,
	"can_be_ka_unit" boolean DEFAULT false,
	"can_be_dirut" boolean DEFAULT false,
	"functional_roles" text[] DEFAULT '{""}',
	"manager_scope" jsonb,
	"signature" text,
	"achievements" jsonb DEFAULT '[]'::jsonb,
	"must_change_password" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"is_profile_complete" boolean DEFAULT false,
	"email_verified" boolean DEFAULT false,
	"auth_user_id" text,
	"managed_hospital_ids" text[] DEFAULT '{""}',
	"manager_id" text,
	"can_be_manager" boolean DEFAULT false,
	"last_announcement_read_timestamp" bigint,
	CONSTRAINT "employees_email_key" UNIQUE("email"),
	CONSTRAINT "employees_gender_check" CHECK (gender = ANY (ARRAY['Laki-laki'::text, 'Perempuan'::text])),
	CONSTRAINT "employees_profession_category_check" CHECK (profession_category = ANY (ARRAY['MEDIS'::text, 'NON MEDIS'::text])),
	CONSTRAINT "employees_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'super-admin'::text, 'admin'::text, 'user'::text]))
);
--> statement-breakpoint
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employee_todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_completed" boolean DEFAULT false,
	"due_date" date,
	"priority" text DEFAULT 'medium',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mentee_targets" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"mentor_id" text NOT NULL,
	"mentee_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"month_key" text NOT NULL,
	"status" text DEFAULT 'in-progress',
	"created_at" bigint NOT NULL,
	"completed_at" bigint,
	CONSTRAINT "mentee_targets_status_check" CHECK (status = ANY (ARRAY['in-progress'::text, 'completed'::text]))
);
--> statement-breakpoint
ALTER TABLE "mentee_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employee_monthly_activities_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"activities_snapshot" jsonb NOT NULL,
	"month_key" text,
	"changed_day" text,
	"activity_id_changed" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"change_type" text NOT NULL,
	"changed_by" text,
	"changed_at" timestamp with time zone DEFAULT now(),
	"source" text,
	"ip_address" text,
	"user_agent" text,
	"notes" text,
	CONSTRAINT "employee_monthly_activities_audit_change_type_check" CHECK (change_type = ANY (ARRAY['INITIAL'::text, 'DAILY_UPDATE'::text, 'FULL_SAVE'::text, 'MERGE'::text]))
);
--> statement-breakpoint
ALTER TABLE "employee_monthly_activities_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"monthly_target" integer NOT NULL,
	"automation_trigger" jsonb,
	CONSTRAINT "daily_activities_category_check" CHECK (category = ANY (ARRAY['SIDIQ (Integritas)'::text, 'TABLIGH (Teamwork)'::text, 'AMANAH (Disiplin)'::text, 'FATONAH (Belajar)'::text]))
);
--> statement-breakpoint
ALTER TABLE "daily_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document_submissions" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"mentee_id" text NOT NULL,
	"mentee_name" text NOT NULL,
	"mentor_id" text NOT NULL,
	"submitted_at" bigint NOT NULL,
	"status" text NOT NULL,
	"document_name" text NOT NULL,
	"document_url" text NOT NULL,
	"notes" text,
	"mentor_notes" text,
	"reviewed_at" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "document_submissions_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
ALTER TABLE "document_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "missed_prayer_requests" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"mentee_id" text NOT NULL,
	"mentee_name" text NOT NULL,
	"mentor_id" text NOT NULL,
	"date" text NOT NULL,
	"prayer_id" text NOT NULL,
	"prayer_name" text NOT NULL,
	"reason" text NOT NULL,
	"requested_at" bigint NOT NULL,
	"status" text DEFAULT 'pending',
	"reviewed_at" bigint,
	"mentor_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "missed_prayer_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
ALTER TABLE "missed_prayer_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sunnah_ibadah" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"icon" text NOT NULL,
	"schedule_type" text,
	"days_of_week" integer[] DEFAULT '{}',
	"date" text,
	"start_time" text,
	"end_time" text,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	CONSTRAINT "sunnah_ibadah_schedule_type_check" CHECK (schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'one-time'::text])),
	CONSTRAINT "sunnah_ibadah_type_check" CHECK (type = ANY (ARRAY['sholat'::text, 'puasa'::text]))
);
--> statement-breakpoint
ALTER TABLE "sunnah_ibadah" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quran_reading_submissions" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"user_id" text NOT NULL,
	"surah_number" integer NOT NULL,
	"surah_name" text NOT NULL,
	"start_ayah" integer NOT NULL,
	"end_ayah" integer NOT NULL,
	"submission_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "quran_reading_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tadarus_sessions" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"category" text,
	"notes" text,
	"is_recurring" boolean DEFAULT false,
	"mentor_id" text NOT NULL,
	"participant_ids" text[] DEFAULT '{""}',
	"present_mentee_ids" text[] DEFAULT '{""}',
	"status" text DEFAULT 'open',
	"mentor_present" boolean DEFAULT false,
	"created_at" bigint NOT NULL,
	CONSTRAINT "tadarus_sessions_category_check" CHECK (category = ANY (ARRAY['UMUM'::text, 'BBQ'::text])),
	CONSTRAINT "tadarus_sessions_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text]))
);
--> statement-breakpoint
ALTER TABLE "tadarus_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sunnah_ibadah_config" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"icon" text,
	"schedule_type" text NOT NULL,
	"days_of_week" integer[],
	"date" text,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sunnah_ibadah_config_schedule_type_check" CHECK (schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'one-time'::text])),
	CONSTRAINT "sunnah_ibadah_config_type_check" CHECK (type = ANY (ARRAY['sholat'::text, 'puasa'::text, 'lainnya'::text]))
);
--> statement-breakpoint
ALTER TABLE "sunnah_ibadah_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tadarus_requests" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"mentee_id" text NOT NULL,
	"mentee_name" text NOT NULL,
	"mentor_id" text NOT NULL,
	"date" text NOT NULL,
	"notes" text,
	"requested_at" bigint NOT NULL,
	"status" text DEFAULT 'pending',
	"reviewed_at" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"category" text,
	CONSTRAINT "tadarus_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
ALTER TABLE "tadarus_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "team_attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"creator_name" text NOT NULL,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"audience_type" text NOT NULL,
	"audience_rules" jsonb,
	"manual_participant_ids" text[] DEFAULT '{""}',
	"attendance_mode" text,
	"zoom_url" text,
	"youtube_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"status" text DEFAULT 'scheduled',
	CONSTRAINT "team_attendance_sessions_attendance_mode_check" CHECK (attendance_mode = ANY (ARRAY['leader'::text, 'self'::text])),
	CONSTRAINT "team_attendance_sessions_audience_type_check" CHECK (audience_type = ANY (ARRAY['public'::text, 'rules'::text, 'manual'::text])),
	CONSTRAINT "team_attendance_sessions_status_check" CHECK (status = ANY (ARRAY['scheduled'::text, 'postponed'::text, 'cancelled'::text])),
	CONSTRAINT "team_attendance_sessions_type_check" CHECK (type = ANY (ARRAY['KIE'::text, 'Doa Bersama'::text, 'BBQ'::text, 'UMUM'::text]))
);
--> statement-breakpoint
ALTER TABLE "team_attendance_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mutabaah_activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"month_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "mutabaah_activations_employee_id_month_key_key" UNIQUE("employee_id","month_key")
);
--> statement-breakpoint
ALTER TABLE "mutabaah_activations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "team_attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"attended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"session_type" text NOT NULL,
	"session_date" text NOT NULL,
	"session_start_time" text NOT NULL,
	"session_end_time" text NOT NULL,
	CONSTRAINT "team_attendance_records_session_user_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "team_attendance_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quran_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "quran_levels_dimension_code_key" UNIQUE("code","dimension")
);
--> statement-breakpoint
ALTER TABLE "quran_levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "monthly_report_submissions" (
	"id" text PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"mentee_id" text NOT NULL,
	"mentee_name" text NOT NULL,
	"month_key" text NOT NULL,
	"week_index" integer NOT NULL,
	"submitted_at" bigint NOT NULL,
	"status" text NOT NULL,
	"mentor_id" text NOT NULL,
	"supervisor_id" text,
	"ka_unit_id" text,
	"mentor_reviewed_at" bigint,
	"mentor_notes" text,
	"supervisor_reviewed_at" bigint,
	"supervisor_notes" text,
	"ka_unit_reviewed_at" bigint,
	"ka_unit_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"reports" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	"manager_id" text,
	"manager_reviewed_at" bigint,
	"manager_notes" text,
	CONSTRAINT "unique_monthly_submission" UNIQUE("mentee_id","month_key","week_index"),
	CONSTRAINT "weekly_report_submissions_status_check" CHECK (status = ANY (ARRAY['pending_mentor'::text, 'pending_supervisor'::text, 'pending_kaunit'::text, 'approved'::text, 'rejected_mentor'::text, 'rejected_supervisor'::text, 'rejected_kaunit'::text]))
);
--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"surah_number" integer NOT NULL,
	"surah_name" text NOT NULL,
	"ayah_number" integer NOT NULL,
	"ayah_text" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_surah_number_ayah_number_key" UNIQUE("ayah_number","surah_number","user_id")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_records_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid,
	"employee_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text,
	"reason" text,
	"timestamp" timestamp with time zone,
	"is_late_entry" boolean,
	"location" text,
	"change_type" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text,
	"old_status" text,
	"new_status" text
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_attendance" ADD CONSTRAINT "activity_attendance_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_attendance" ADD CONSTRAINT "activity_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_quran_history" ADD CONSTRAINT "employee_quran_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_monthly_reports" ADD CONSTRAINT "employee_monthly_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_quran_competency" ADD CONSTRAINT "employee_quran_competency_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_quran_competency" ADD CONSTRAINT "employee_quran_competency_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_quran_reading_history" ADD CONSTRAINT "fk_quran_reading_history_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_reading_history" ADD CONSTRAINT "fk_reading_history_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_dirut_id_fkey" FOREIGN KEY ("dirut_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_ka_unit_id_fkey" FOREIGN KEY ("ka_unit_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentee_targets" ADD CONSTRAINT "mentee_targets_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentee_targets" ADD CONSTRAINT "mentee_targets_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submissions" ADD CONSTRAINT "document_submissions_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_submissions" ADD CONSTRAINT "document_submissions_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missed_prayer_requests" ADD CONSTRAINT "missed_prayer_requests_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missed_prayer_requests" ADD CONSTRAINT "missed_prayer_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quran_reading_submissions" ADD CONSTRAINT "quran_reading_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tadarus_sessions" ADD CONSTRAINT "tadarus_sessions_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tadarus_requests" ADD CONSTRAINT "tadarus_requests_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tadarus_requests" ADD CONSTRAINT "tadarus_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutabaah_activations" ADD CONSTRAINT "mutabaah_activations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_attendance_records" ADD CONSTRAINT "team_attendance_records_session_exists" FOREIGN KEY ("session_id") REFERENCES "public"."team_attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_attendance_records" ADD CONSTRAINT "team_attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."team_attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ADD CONSTRAINT "weekly_report_submissions_ka_unit_id_fkey" FOREIGN KEY ("ka_unit_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ADD CONSTRAINT "weekly_report_submissions_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ADD CONSTRAINT "weekly_report_submissions_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ADD CONSTRAINT "weekly_report_submissions_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("is_read" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_timestamp" ON "notifications" USING btree ("timestamp" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_admin" ON "audit_logs" USING btree ("admin_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_attendance_activity_id" ON "activity_attendance" USING btree ("activity_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_attendance_employee_id" ON "activity_attendance" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "attendance_records_employee_id_idx" ON "attendance_records" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "attendance_records_entity_id_idx" ON "attendance_records" USING btree ("entity_id" text_ops);--> statement-breakpoint
CREATE INDEX "attendance_records_timestamp_idx" ON "attendance_records" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_timestamp" ON "attendance_records" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_history_date" ON "attendance_history" USING btree ("date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_history_employee" ON "attendance_history" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activities_created_by" ON "activities" USING btree ("created_by" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activities_date" ON "activities" USING btree ("date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activities_date_status" ON "activities" USING btree ("date" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activities_status" ON "activities" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activities_type" ON "activities" USING btree ("activity_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_announcements_scope" ON "announcements" USING btree ("scope" text_ops);--> statement-breakpoint
CREATE INDEX "idx_announcements_target_hospital" ON "announcements" USING btree ("target_hospital_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_announcements_target_hospital_ids" ON "announcements" USING gin ("target_hospital_ids" array_ops);--> statement-breakpoint
CREATE INDEX "idx_announcements_timestamp" ON "announcements" USING btree ("timestamp" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_history_employee_id" ON "employee_quran_history" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_monthly_reports_reports_gin" ON "employee_monthly_reports" USING gin ("reports" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_monthly_reports_updated_at" ON "employee_monthly_reports" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_job_structure_category" ON "job_structure" USING btree ("profession_category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_job_structure_unit" ON "job_structure" USING btree ("unit" text_ops);--> statement-breakpoint
CREATE INDEX "idx_competency_employee_id" ON "employee_quran_competency" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_hospitals_brand" ON "hospitals" USING btree ("brand" text_ops);--> statement-breakpoint
CREATE INDEX "idx_hospitals_is_active" ON "hospitals" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_quran_reading_history_employee_id" ON "employee_quran_reading_history" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_quran_reading_history_employee_id" ON "employee_quran_reading_history" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_reading_history_employee_id" ON "employee_reading_history" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reading_history_employee_id" ON "employee_reading_history" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_emails" ON "employees" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_auth_user_id" ON "employees" USING btree ("auth_user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_email" ON "employees" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_hospital" ON "employees" USING btree ("hospital_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_is_active" ON "employees" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_is_profile_complete" ON "employees" USING btree ("is_profile_complete" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_ka_unit_id" ON "employees" USING btree ("ka_unit_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_manager_id" ON "employees" USING btree ("manager_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_manager_scope" ON "employees" USING gin ("manager_scope" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_role" ON "employees" USING btree ("role" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_supervisor_id" ON "employees" USING btree ("supervisor_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employees_unit" ON "employees" USING btree ("unit" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_todos_due_date" ON "employee_todos" USING btree ("due_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_todos_employee_id" ON "employee_todos" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_todos_is_completed" ON "employee_todos" USING btree ("is_completed" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_targets_mentee" ON "mentee_targets" USING btree ("mentee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_targets_month" ON "mentee_targets" USING btree ("month_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_monthly_activities_audit_changed_at" ON "employee_monthly_activities_audit" USING btree ("changed_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_monthly_activities_audit_employee_id" ON "employee_monthly_activities_audit" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_monthly_activities_audit_employee_month" ON "employee_monthly_activities_audit" USING btree ("employee_id" text_ops,"month_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_employee_monthly_activities_audit_month_key" ON "employee_monthly_activities_audit" USING btree ("month_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_quran_reading_date" ON "quran_reading_submissions" USING btree ("submission_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_quran_reading_user" ON "quran_reading_submissions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_quran_submissions_date" ON "quran_reading_submissions" USING btree ("submission_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_quran_submissions_user_date" ON "quran_reading_submissions" USING btree ("user_id" text_ops,"submission_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_quran_submissions_user_id" ON "quran_reading_submissions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tadarus_date" ON "tadarus_sessions" USING btree ("date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tadarus_mentor" ON "tadarus_sessions" USING btree ("mentor_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_sunnah_ibadah_created_at" ON "sunnah_ibadah_config" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_sunnah_ibadah_schedule_type" ON "sunnah_ibadah_config" USING btree ("schedule_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_sessions_creator" ON "team_attendance_sessions" USING btree ("creator_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_sessions_date" ON "team_attendance_sessions" USING btree ("date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_sessions_type" ON "team_attendance_sessions" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_records_attended_at" ON "team_attendance_records" USING btree ("attended_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_records_date" ON "team_attendance_records" USING btree ("session_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_records_session_id" ON "team_attendance_records" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_records_user_id" ON "team_attendance_records" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reports_mentee" ON "monthly_report_submissions" USING btree ("mentee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reports_month" ON "monthly_report_submissions" USING btree ("month_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "monthly_report_submissions" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bookmarks_surah_ayah" ON "bookmarks" USING btree ("surah_number" int4_ops,"ayah_number" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user_id" ON "bookmarks" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE VIEW "public"."v_daily_activity_changes" AS (SELECT employee_id, date(changed_at) AS change_date, count(*) AS total_changes, string_agg(DISTINCT change_type, ', '::text) AS change_types, min(changed_at) AS first_change, max(changed_at) AS last_change FROM employee_monthly_activities_audit GROUP BY employee_id, (date(changed_at)) ORDER BY (date(changed_at)) DESC, employee_id);--> statement-breakpoint
CREATE VIEW "public"."v_attendance_changes" AS (SELECT employee_id AS "employeeId", entity_id AS "entityId", date("timestamp") AS date, old_status AS "oldStatus", new_status AS "newStatus", change_type AS "changeType", changed_at AS "changedAt", changed_by AS "changedBy", reason, is_late_entry AS "isLateEntry", concat('Status changed from ', COALESCE(old_status, 'empty'::text), ' to ', COALESCE(new_status, 'empty'::text), CASE WHEN reason IS NOT NULL AND reason <> ''::text THEN concat(' (Reason: ', reason, ')') ELSE ''::text END) AS "changeDescription" FROM attendance_records_history h);--> statement-breakpoint
CREATE POLICY "Allow all inserts on notifications" ON "notifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Allow all selects on notifications" ON "notifications" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Activities: Delete all" ON "activities" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "Activities: Insert all" ON "activities" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Activities: Select all" ON "activities" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Activities: Update all" ON "activities" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can manage history" ON "employee_quran_history" AS PERMISSIVE FOR ALL TO public USING (((auth.uid())::text IN ( SELECT employees.id
   FROM employees
  WHERE (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text])))));--> statement-breakpoint
CREATE POLICY "Everyone can read history" ON "employee_quran_history" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins manage all" ON "employee_monthly_reports" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))));--> statement-breakpoint
CREATE POLICY "Allow everyone to delete monthly reports" ON "employee_monthly_reports" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Allow everyone to insert monthly reports" ON "employee_monthly_reports" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Allow everyone to update monthly reports" ON "employee_monthly_reports" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Allow everyone to view all monthly reports" ON "employee_monthly_reports" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Mentors view mentees reports" ON "employee_monthly_reports" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users manage own reports" ON "employee_monthly_reports" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Admin insert access for job structure" ON "job_structure" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['super-admin'::text, 'admin'::text]))))));--> statement-breakpoint
CREATE POLICY "Admin update access for job structure" ON "job_structure" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Public read access for job structure" ON "job_structure" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can manage all competency" ON "employee_quran_competency" AS PERMISSIVE FOR ALL TO public USING (((auth.uid())::text IN ( SELECT employees.id
   FROM employees
  WHERE (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text])))));--> statement-breakpoint
CREATE POLICY "Assessors can update competency" ON "employee_quran_competency" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Public Access" ON "employee_quran_competency" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Superiors can read subordinate competency" ON "employee_quran_competency" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can read own competency" ON "employee_quran_competency" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Allow login authentication" ON "employees" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Allow profile updates (trigger-protected)" ON "employees" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Allow admins to view all audits" ON "employee_monthly_activities_audit" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = employee_monthly_activities_audit.employee_id) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))));--> statement-breakpoint
CREATE POLICY "Allow employees to view own audit" ON "employee_monthly_activities_audit" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can delete own submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR DELETE TO public USING (((auth.uid())::text = user_id));--> statement-breakpoint
CREATE POLICY "Users can delete own Quran submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Users can insert own Quran submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert own submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can update own Quran submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can update own submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own Quran submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can view own submissions" ON "quran_reading_submissions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "TeamSessions: Delete all" ON "team_attendance_sessions" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "TeamSessions: Insert all" ON "team_attendance_sessions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "TeamSessions: Select all" ON "team_attendance_sessions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "TeamSessions: Update all" ON "team_attendance_sessions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Admins can manage activations" ON "mutabaah_activations" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.auth_user_id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))));--> statement-breakpoint
CREATE POLICY "Admins can view all activations" ON "mutabaah_activations" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert their own activations" ON "mutabaah_activations" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can view their own activations" ON "mutabaah_activations" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Employees can view attendance records" ON "team_attendance_records" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Only session creators can delete attendance records" ON "team_attendance_records" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Only session creators can update attendance records" ON "team_attendance_records" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can insert own attendance, creators can insert for their " ON "team_attendance_records" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Allow public read on quran_levels" ON "quran_levels" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Public Access" ON "quran_levels" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "Users can delete own bookmarks" ON "bookmarks" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "Users can insert own bookmarks" ON "bookmarks" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can update own bookmarks" ON "bookmarks" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own bookmarks" ON "bookmarks" AS PERMISSIVE FOR SELECT TO public;
*/