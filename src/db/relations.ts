import { relations } from "drizzle-orm/relations";
import { employees, notifications, auditLogs, activities, activityAttendance, attendanceHistory, attendances, announcements, employeeQuranHistory, employeeQuranCompetency, employeeQuranReadingHistory, employeeReadingHistory, menteeTargets, documentSubmissions, missedPrayerRequests, quranReadingSubmissions, tadarusSessions, tadarusRequests, mutabaahActivations, teamAttendanceSessions, teamAttendanceRecords, monthlyReportSubmissions } from "./schema";

export const notificationsRelations = relations(notifications, ({ one }) => ({
	employee: one(employees, {
		fields: [notifications.userId],
		references: [employees.id]
	}),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
	notifications: many(notifications),
	auditLogs: many(auditLogs),
	activityAttendances: many(activityAttendance),
	attendanceHistories: many(attendanceHistory),
	attendances: many(attendances),
	activities: many(activities),
	announcements: many(announcements),
	employeeQuranHistories: many(employeeQuranHistory),

	employeeQuranCompetencies_assessorId: many(employeeQuranCompetency, {
		relationName: "employeeQuranCompetency_assessorId_employees_id"
	}),
	employeeQuranCompetencies_employeeId: many(employeeQuranCompetency, {
		relationName: "employeeQuranCompetency_employeeId_employees_id"
	}),
	employeeQuranReadingHistories: many(employeeQuranReadingHistory),
	employeeReadingHistories: many(employeeReadingHistory),
	employee_dirutId: one(employees, {
		fields: [employees.dirutId],
		references: [employees.id],
		relationName: "employees_dirutId_employees_id"
	}),
	employees_dirutId: many(employees, {
		relationName: "employees_dirutId_employees_id"
	}),
	employee_kaUnitId: one(employees, {
		fields: [employees.kaUnitId],
		references: [employees.id],
		relationName: "employees_kaUnitId_employees_id"
	}),
	employees_kaUnitId: many(employees, {
		relationName: "employees_kaUnitId_employees_id"
	}),
	employee_managerId: one(employees, {
		fields: [employees.managerId],
		references: [employees.id],
		relationName: "employees_managerId_employees_id"
	}),
	employees_managerId: many(employees, {
		relationName: "employees_managerId_employees_id"
	}),
	employee_mentorId: one(employees, {
		fields: [employees.mentorId],
		references: [employees.id],
		relationName: "employees_mentorId_employees_id"
	}),
	employees_mentorId: many(employees, {
		relationName: "employees_mentorId_employees_id"
	}),
	employee_supervisorId: one(employees, {
		fields: [employees.supervisorId],
		references: [employees.id],
		relationName: "employees_supervisorId_employees_id"
	}),
	employees_supervisorId: many(employees, {
		relationName: "employees_supervisorId_employees_id"
	}),
	menteeTargets_menteeId: many(menteeTargets, {
		relationName: "menteeTargets_menteeId_employees_id"
	}),
	menteeTargets_mentorId: many(menteeTargets, {
		relationName: "menteeTargets_mentorId_employees_id"
	}),
	documentSubmissions_menteeId: many(documentSubmissions, {
		relationName: "documentSubmissions_menteeId_employees_id"
	}),
	documentSubmissions_mentorId: many(documentSubmissions, {
		relationName: "documentSubmissions_mentorId_employees_id"
	}),
	missedPrayerRequests_menteeId: many(missedPrayerRequests, {
		relationName: "missedPrayerRequests_menteeId_employees_id"
	}),
	missedPrayerRequests_mentorId: many(missedPrayerRequests, {
		relationName: "missedPrayerRequests_mentorId_employees_id"
	}),
	quranReadingSubmissions: many(quranReadingSubmissions),
	tadarusSessions: many(tadarusSessions),
	tadarusRequests_menteeId: many(tadarusRequests, {
		relationName: "tadarusRequests_menteeId_employees_id"
	}),
	tadarusRequests_mentorId: many(tadarusRequests, {
		relationName: "tadarusRequests_mentorId_employees_id"
	}),
	mutabaahActivations: many(mutabaahActivations),
	monthlyReportSubmissions_kaUnitId: many(monthlyReportSubmissions, {
		relationName: "monthlyReportSubmissions_kaUnitId_employees_id"
	}),
	monthlyReportSubmissions_menteeId: many(monthlyReportSubmissions, {
		relationName: "monthlyReportSubmissions_menteeId_employees_id"
	}),
	monthlyReportSubmissions_mentorId: many(monthlyReportSubmissions, {
		relationName: "monthlyReportSubmissions_mentorId_employees_id"
	}),
	monthlyReportSubmissions_supervisorId: many(monthlyReportSubmissions, {
		relationName: "monthlyReportSubmissions_supervisorId_employees_id"
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	employee: one(employees, {
		fields: [auditLogs.adminId],
		references: [employees.id]
	}),
}));

export const activityAttendanceRelations = relations(activityAttendance, ({ one }) => ({
	activity: one(activities, {
		fields: [activityAttendance.activityId],
		references: [activities.id]
	}),
	employee: one(employees, {
		fields: [activityAttendance.employeeId],
		references: [employees.id]
	}),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
	activityAttendances: many(activityAttendance),
	employee: one(employees, {
		fields: [activities.createdBy],
		references: [employees.id]
	}),
}));

export const attendanceHistoryRelations = relations(attendanceHistory, ({ one }) => ({
	employee: one(employees, {
		fields: [attendanceHistory.employeeId],
		references: [employees.id]
	}),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
	employee: one(employees, {
		fields: [attendances.employeeId],
		references: [employees.id]
	}),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
	employee: one(employees, {
		fields: [announcements.authorId],
		references: [employees.id]
	}),
}));

export const employeeQuranHistoryRelations = relations(employeeQuranHistory, ({ one }) => ({
	employee: one(employees, {
		fields: [employeeQuranHistory.employeeId],
		references: [employees.id]
	}),
}));



export const employeeQuranCompetencyRelations = relations(employeeQuranCompetency, ({ one }) => ({
	employee_assessorId: one(employees, {
		fields: [employeeQuranCompetency.assessorId],
		references: [employees.id],
		relationName: "employeeQuranCompetency_assessorId_employees_id"
	}),
	employee_employeeId: one(employees, {
		fields: [employeeQuranCompetency.employeeId],
		references: [employees.id],
		relationName: "employeeQuranCompetency_employeeId_employees_id"
	}),
}));

export const employeeQuranReadingHistoryRelations = relations(employeeQuranReadingHistory, ({ one }) => ({
	employee: one(employees, {
		fields: [employeeQuranReadingHistory.employeeId],
		references: [employees.id]
	}),
}));

export const employeeReadingHistoryRelations = relations(employeeReadingHistory, ({ one }) => ({
	employee: one(employees, {
		fields: [employeeReadingHistory.employeeId],
		references: [employees.id]
	}),
}));

export const menteeTargetsRelations = relations(menteeTargets, ({ one }) => ({
	employee_menteeId: one(employees, {
		fields: [menteeTargets.menteeId],
		references: [employees.id],
		relationName: "menteeTargets_menteeId_employees_id"
	}),
	employee_mentorId: one(employees, {
		fields: [menteeTargets.mentorId],
		references: [employees.id],
		relationName: "menteeTargets_mentorId_employees_id"
	}),
}));

export const documentSubmissionsRelations = relations(documentSubmissions, ({ one }) => ({
	employee_menteeId: one(employees, {
		fields: [documentSubmissions.menteeId],
		references: [employees.id],
		relationName: "documentSubmissions_menteeId_employees_id"
	}),
	employee_mentorId: one(employees, {
		fields: [documentSubmissions.mentorId],
		references: [employees.id],
		relationName: "documentSubmissions_mentorId_employees_id"
	}),
}));

export const missedPrayerRequestsRelations = relations(missedPrayerRequests, ({ one }) => ({
	employee_menteeId: one(employees, {
		fields: [missedPrayerRequests.menteeId],
		references: [employees.id],
		relationName: "missedPrayerRequests_menteeId_employees_id"
	}),
	employee_mentorId: one(employees, {
		fields: [missedPrayerRequests.mentorId],
		references: [employees.id],
		relationName: "missedPrayerRequests_mentorId_employees_id"
	}),
}));

export const quranReadingSubmissionsRelations = relations(quranReadingSubmissions, ({ one }) => ({
	employee: one(employees, {
		fields: [quranReadingSubmissions.userId],
		references: [employees.id]
	}),
}));

export const tadarusSessionsRelations = relations(tadarusSessions, ({ one }) => ({
	employee: one(employees, {
		fields: [tadarusSessions.mentorId],
		references: [employees.id]
	}),
}));

export const tadarusRequestsRelations = relations(tadarusRequests, ({ one }) => ({
	employee_menteeId: one(employees, {
		fields: [tadarusRequests.menteeId],
		references: [employees.id],
		relationName: "tadarusRequests_menteeId_employees_id"
	}),
	employee_mentorId: one(employees, {
		fields: [tadarusRequests.mentorId],
		references: [employees.id],
		relationName: "tadarusRequests_mentorId_employees_id"
	}),
}));

export const mutabaahActivationsRelations = relations(mutabaahActivations, ({ one }) => ({
	employee: one(employees, {
		fields: [mutabaahActivations.employeeId],
		references: [employees.id]
	}),
}));

export const teamAttendanceRecordsRelations = relations(teamAttendanceRecords, ({ one }) => ({
	teamAttendanceSession_sessionId: one(teamAttendanceSessions, {
		fields: [teamAttendanceRecords.sessionId],
		references: [teamAttendanceSessions.id],
		relationName: "teamAttendanceRecords_sessionId_teamAttendanceSessions_id"
	}),
}));

export const teamAttendanceSessionsRelations = relations(teamAttendanceSessions, ({ many }) => ({
	teamAttendanceRecords_sessionId: many(teamAttendanceRecords, {
		relationName: "teamAttendanceRecords_sessionId_teamAttendanceSessions_id"
	}),
}));

export const monthlyReportSubmissionsRelations = relations(monthlyReportSubmissions, ({ one }) => ({
	employee_kaUnitId: one(employees, {
		fields: [monthlyReportSubmissions.kaUnitId],
		references: [employees.id],
		relationName: "monthlyReportSubmissions_kaUnitId_employees_id"
	}),
	employee_menteeId: one(employees, {
		fields: [monthlyReportSubmissions.menteeId],
		references: [employees.id],
		relationName: "monthlyReportSubmissions_menteeId_employees_id"
	}),
	employee_mentorId: one(employees, {
		fields: [monthlyReportSubmissions.mentorId],
		references: [employees.id],
		relationName: "monthlyReportSubmissions_mentorId_employees_id"
	}),
	employee_supervisorId: one(employees, {
		fields: [monthlyReportSubmissions.supervisorId],
		references: [employees.id],
		relationName: "monthlyReportSubmissions_supervisorId_employees_id"
	}),
}));