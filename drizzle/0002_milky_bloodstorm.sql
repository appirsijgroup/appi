CREATE TABLE "employee_monthly_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"month_key" text NOT NULL,
	"report_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "employee_monthly_records_unique_month" UNIQUE("employee_id","month_key")
);
--> statement-breakpoint
ALTER TABLE "employee_monthly_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "employee_monthly_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "Admins manage all" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP POLICY "Allow everyone to delete monthly reports" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP POLICY "Allow everyone to insert monthly reports" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP POLICY "Allow everyone to update monthly reports" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP POLICY "Allow everyone to view all monthly reports" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP POLICY "Mentors view mentees reports" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP POLICY "Users manage own reports" ON "employee_monthly_reports" CASCADE;--> statement-breakpoint
DROP TABLE "employee_monthly_reports" CASCADE;--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "attendance_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "document_submissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "job_structure" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "mentee_targets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "missed_prayer_requests" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "quran_reading_submissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "tadarus_requests" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "tadarus_sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "activity_attendance" ADD COLUMN "hospital_id" text;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "hospital_id" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "can_be_bph" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "nik" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employment_status" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "birth_place" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "birth_date" text;--> statement-breakpoint
ALTER TABLE "team_attendance_records" ADD COLUMN "hospital_id" text;--> statement-breakpoint
ALTER TABLE "employee_monthly_records" ADD CONSTRAINT "employee_monthly_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_emr_employee_month" ON "employee_monthly_records" USING btree ("employee_id","month_key" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_emr_report_data" ON "employee_monthly_records" USING gin ("report_data");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ADD CONSTRAINT "weekly_report_submissions_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_report_submissions" ADD CONSTRAINT "weekly_report_submissions_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_attendance_hospital" ON "activity_attendance" USING btree ("hospital_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_hospital" ON "attendance_records" USING btree ("hospital_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_missed_prayer_mentee_id" ON "missed_prayer_requests" USING btree ("mentee_id");--> statement-breakpoint
CREATE INDEX "idx_missed_prayer_status" ON "missed_prayer_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_missed_prayer_requested_at" ON "missed_prayer_requests" USING btree ("requested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_tadarus_requests_mentee_id" ON "tadarus_requests" USING btree ("mentee_id");--> statement-breakpoint
CREATE INDEX "idx_tadarus_requests_status" ON "tadarus_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tadarus_requests_requested_at" ON "tadarus_requests" USING btree ("requested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_team_attendance_hospital" ON "team_attendance_records" USING btree ("hospital_id" text_ops);--> statement-breakpoint
CREATE POLICY "Admins manage all records" ON "employee_monthly_records" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
    FROM employees
    WHERE ((employees.id = (auth.uid())::text) AND (employees.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))));--> statement-breakpoint
CREATE POLICY "Allow everyone to view/edit their own records" ON "employee_monthly_records" AS PERMISSIVE FOR ALL TO public;