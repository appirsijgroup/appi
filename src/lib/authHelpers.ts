import { getSession } from './auth';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Checks if the current session user is authorized to view or manage the target user's data.
 * authorization order: 
 * 1. Is self
 * 2. Is Admin/Super-Admin/Owner
 * 3. Is Mentor/Supervisor/KaUnit/Manager/Dirut of the target user
 */
export async function isAuthorizedForUser(targetUserId: string): Promise<boolean> {
    const session = await getSession();
    if (!session) return false;

    // 1. Is self
    if (session.userId === targetUserId) return true;

    // 2. Is Admin or Super Admin (including functional roles like BPH)
    const isAdminRole = ['admin', 'super-admin', 'owner'].includes(session.role);
    const isBPH = !!session.canBeBPH || (session.functionalRoles?.includes('BPH') ?? false);
    if (isAdminRole || isBPH) return true;

    // 3. Is Superior (Mentor/KaUnit/etc) of the target
    // 4. OR is Subordinate of the target (viewing your boss's name/profile)
    try {
        // Fetch target user's superiors
        const target = await db.query.employees.findFirst({
            where: eq(employees.id, targetUserId),
            columns: {
                mentorId: true,
                kaUnitId: true,
                supervisorId: true,
                managerId: true,
                dirutId: true,
            }
        });

        if (!target) return false;

        const targetSuperiorIds = [
            target.mentorId,
            target.kaUnitId,
            target.supervisorId,
            target.managerId,
            target.dirutId
        ].filter(Boolean);

        // Current user is a superior of the target
        if (targetSuperiorIds.includes(session.userId)) return true;

        // Fetch current user's superiors to see if target is one of them
        const currentUser = await db.query.employees.findFirst({
            where: eq(employees.id, session.userId),
            columns: {
                mentorId: true,
                kaUnitId: true,
                supervisorId: true,
                managerId: true,
                dirutId: true,
            }
        });

        if (currentUser) {
            const mySuperiorIds = [
                currentUser.mentorId,
                currentUser.kaUnitId,
                currentUser.supervisorId,
                currentUser.managerId,
                currentUser.dirutId
            ].filter(Boolean);

            // Target is a superior of the current user
            if (mySuperiorIds.includes(targetUserId)) return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking authorization:', error);
        return false;
    }
}

/**
 * Wrapper for API routes to enforce authorization
 */
export async function enforceAuth(targetUserId: string) {
    const authorized = await isAuthorizedForUser(targetUserId);
    if (!authorized) {
        return NextResponse.json({ error: 'Permission denied: Unauthorized access to this resource' }, { status: 403 });
    }
    return null;
}

/**
 * Check if current user is an admin or has administrative privileges
 */
export async function isAdmin(): Promise<boolean> {
    const session = await getSession();
    if (!session) return false;

    // Check role hierarchy
    const isAdminRole = ['admin', 'super-admin', 'owner'].includes(session.role);

    // Check functional roles (BPH etc)
    const isBPH = !!session.canBeBPH ||
        (session.functionalRoles?.includes('BPH') ?? false);

    return isAdminRole || isBPH;
}
