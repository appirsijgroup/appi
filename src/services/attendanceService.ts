import { timeValidationService } from './timeValidationService';

/**
 * Attendance Record interface (Matches DB schema)
 */
export interface AttendanceRecord {
  id: string;
  employee_id: string;
  entity_id: string;
  status: 'hadir' | 'tidak-hadir';
  reason?: string | null;
  timestamp: string;
  is_late_entry?: boolean;
  location?: string | null;
  created_at?: string;
}

/**
 * Attendance Service
 * Handles all attendance-related operations via internal APIs
 */

/**
 * Get attendance records for an employee
 */
export const getEmployeeAttendance = async (employeeId: string): Promise<Record<string, AttendanceRecord>> => {
  try {
    const response = await fetch(`/api/attendance?employeeId=${employeeId}`, { credentials: 'include' });
    if (!response.ok) return {};
    const result = await response.json();
    return result.attendance || {};
  } catch (err) {
    console.error('getEmployeeAttendance error:', err);
    return {};
  }
};

/**
 * Get all attendance records (with optional date range filter)
 * Note: This might be heavy, use with caution or use the Admin Dash API
 */
export const getAllAttendanceRecords = async (startDate?: string, endDate?: string): Promise<Record<string, Record<string, any>>> => {
  // For admin purposes, we should ideally use the sync-full API or a dedicated admin attendance API
  // but for backward compatibility, if this is needed:
  console.warn('getAllAttendanceRecords called. This is a heavy operation.');
  return {};
};

/**
 * Submit attendance record
 */
export const submitAttendance = async (
  employeeId: string,
  entityId: string,
  status: 'hadir' | 'tidak-hadir',
  reason: string | null = null,
  isLateEntry: boolean = false,
  location?: { latitude: number; longitude: number },
  customTimestamp?: string
): Promise<AttendanceRecord> => {
  try {
    // Validate time
    const timeValidation = timeValidationService.validateTime();
    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Attendance submission denied.');
    }

    // Future date check
    const entityDateMatch = entityId.match(/\d{4}-\d{2}-\d{2}/);
    if (entityDateMatch) {
      const entityDate = new Date(entityDateMatch[0]);
      if (entityDate > timeValidation.correctedTime) {
        throw new Error('Cannot submit attendance for future dates.');
      }
    }

    const timestamp = customTimestamp || timeValidation.correctedTime.toISOString();

    const response = await fetch('/api/attendance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        entity_id: entityId,
        status,
        reason,
        timestamp,
        is_late_entry: isLateEntry,
        location: location ? JSON.stringify(location) : null
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit attendance');
    }

    const result = await response.json();
    return result.data;
  } catch (err) {
    console.error('submitAttendance error:', err);
    throw err;
  }
};

/**
 * Delete attendance record
 */
export const deleteAttendance = async (employeeId: string, entityId: string): Promise<void> => {
  const response = await fetch(`/api/attendance/submit?employeeId=${employeeId}&entityId=${entityId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete attendance');
  }
};

/**
 * Batch update attendance
 */
export const batchUpdateAttendance = async (
  employeeId: string,
  attendanceRecords: any[]
): Promise<any[]> => {
  const timeValidation = timeValidationService.validateTime();
  if (!timeValidation.isValid) {
    throw new Error('System time appears to be manipulated.');
  }

  const response = await fetch('/api/attendance/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId,
      records: attendanceRecords.map(r => ({
        ...r,
        employee_id: employeeId,
        timestamp: r.timestamp || timeValidation.correctedTime.toISOString()
      }))
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to batch update');
  }

  const result = await response.json();
  return result.data;
};

/**
 * Get attendance history for an employee
 */
export const getAttendanceHistory = async (employeeId: string): Promise<Record<string, AttendanceRecord>> => {
  const response = await fetch(`/api/attendance?employeeId=${employeeId}&history=true`, { credentials: 'include' });
  if (!response.ok) return {};
  const { history } = await response.json();
  return history || {};
};