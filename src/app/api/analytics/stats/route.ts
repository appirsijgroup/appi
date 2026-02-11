import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 3. Query Params
        const { searchParams } = new URL(request.url);
        const hospitalId = searchParams.get('hospitalId')?.toLowerCase();
        const month = searchParams.get('month'); // "01"
        const year = searchParams.get('year');   // "2026"

        // 4. User Role & Access Check 
        const { rows: userRows } = await query(
            `SELECT role, hospital_id, functional_roles, managed_hospital_ids FROM employees WHERE id = $1`,
            [session.userId]
        );
        const user = userRows[0];

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Normalize roles and functional roles
        const userFuncRoles = user.functional_roles || [];
        const isBPH = Array.isArray(userFuncRoles) ? userFuncRoles.includes('BPH') : false;
        const isSuper = user.role === 'super-admin';
        const canSeeGlobal = isBPH || isSuper;

        let enforcedHospitalId = hospitalId;

        // Security Enforcement
        if (!canSeeGlobal) {
            const allowedHospitals = [user.hospital_id, ...(user.managed_hospital_ids || [])]
                .filter(Boolean)
                .map((id: string) => id.toLowerCase());

            if (!enforcedHospitalId || enforcedHospitalId === 'all') {
                enforcedHospitalId = user.hospital_id?.toLowerCase() || 'unknown';
            } else if (!allowedHospitals.includes(enforcedHospitalId)) {
                return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            }
        }

        // 5. Determine Current Month Key
        const now = new Date();
        const currentMonthKey = (month && year)
            ? `${year}-${month.padStart(2, '0')}`
            : now.toISOString().slice(0, 7); // Default: "YYYY-MM"

        // Prepare Base Filters for Parallel Queries
        const isAllHospitals = !enforcedHospitalId || enforcedHospitalId === 'all';

        // Helper to inject hospital filter
        const hospFilter = (prefix: string = '') => {
            if (isAllHospitals) return '';
            // Simple ILIKE match similar to original Database logic
            const col = prefix ? `${prefix}.hospital_id` : 'hospital_id';
            return `AND ${col} ILIKE '%${enforcedHospitalId}%'`;
        };

        // 5. Execute Highly Optimized Aggregated Queries
        const [
            totalAggRes,
            activatedAggRes,
            mentorsAggRes,
            complianceAggRes,
            quranAggRes,
            hospitalsRes
        ] = await Promise.all([
            // Total Active Employees per unit/hosp
            query(`SELECT hospital_id, unit, COUNT(*)::int as count 
                   FROM employees 
                   WHERE is_active = true 
                   AND role NOT IN ('admin', 'super-admin') 
                   ${hospFilter()}
                   GROUP BY hospital_id, unit`),

            // Activated This Month per unit/hosp
            query(`SELECT e.hospital_id, e.unit, COUNT(ma.employee_id)::int as count 
                   FROM mutabaah_activations ma 
                   JOIN employees e ON ma.employee_id = e.id 
                   WHERE ma.month_key = $1 
                   AND e.is_active = true 
                   AND e.role NOT IN ('admin', 'super-admin') 
                   ${hospFilter('e')}
                   GROUP BY e.hospital_id, e.unit`, [currentMonthKey]),

            // Mentors per unit/hosp
            query(`SELECT hospital_id, unit, COUNT(*)::int as count 
                   FROM employees 
                   WHERE is_active = true 
                   AND can_be_mentor = true 
                   AND role NOT IN ('admin', 'super-admin') 
                   ${hospFilter()}
                   GROUP BY hospital_id, unit`),

            // Compliance (records exists) per unit/hosp
            query(`SELECT e.hospital_id, e.unit, COUNT(emr.employee_id)::int as count 
                   FROM employee_monthly_records emr 
                   JOIN employees e ON emr.employee_id = e.id 
                   WHERE emr.month_key = $1 
                   ${hospFilter('e')}
                   GROUP BY e.hospital_id, e.unit`, [currentMonthKey]),

            // Quran Metrics (Aggregated with complex logic in SQL for maximum speed)
            query(`SELECT 
                      e.hospital_id, 
                      e.unit, 
                      COUNT(*)::int as assessed,
                      COUNT(CASE WHEN reading_level IN ('R2', 'R3') THEN 1 END)::int as competent,
                      COUNT(CASE WHEN (reading_level = 'R3' AND tajwid_level = 'T3') OR (memorization_level IN ('H3', 'H4', 'H5')) THEN 1 END)::int as advanced,
                      SUM(CASE reading_level WHEN 'R0' THEN 0 WHEN 'R1' THEN 33 WHEN 'R2' THEN 66 WHEN 'R3' THEN 100 ELSE 0 END)::int as sum_score
                   FROM employee_quran_competency eqc 
                   JOIN employees e ON eqc.employee_id = e.id 
                   WHERE e.is_active = true 
                   AND e.role NOT IN ('admin', 'super-admin')
                   ${hospFilter('e')}
                   GROUP BY e.hospital_id, e.unit`),

            // Hospitals List (Static reference)
            query(`SELECT id, name, brand FROM hospitals`)
        ]);

        const breakdownDataMap: Record<string, any> = {};

        // 6. Aggregate Grouped Results efficiently
        const lowerCaseToId: Record<string, string> = {};
        (hospitalsRes.rows || []).forEach((h: any) => {
            lowerCaseToId[h.id.toLowerCase()] = h.id;
        });
        const mapHid = (raw: string) => lowerCaseToId[raw?.toLowerCase()] || raw;

        const getTargetGroupKey = (row: any) => {
            if (isAllHospitals) return mapHid(row.hospital_id);
            // Normalize Unit: Trim, Collapse Spaces, Uppercase
            const u = row.unit;
            if (!u || typeof u !== 'string' || !u.trim()) return 'TANPA UNIT';
            return u.trim().replace(/\s+/g, ' ').toUpperCase();
        };

        const ensureAndGetTarget = (row: any) => {
            const key = getTargetGroupKey(row);
            if (!breakdownDataMap[key]) {
                let brandStr = key;
                let nameStr = key;

                if (isAllHospitals) {
                    const hosp = hospitalsRes.rows.find(h => h.id === key) || { brand: key, name: key };
                    brandStr = hosp.brand;
                    nameStr = hosp.name;
                } else {
                    // Use the first encountered casing for display
                    const rawUnit = row.unit ? row.unit.trim() : 'Tanpa Unit';
                    brandStr = rawUnit;
                    nameStr = rawUnit;
                }

                breakdownDataMap[key] = {
                    id: key,
                    brand: brandStr,
                    name: nameStr,
                    total: 0, activated: 0, compliance: 0,
                    quranAssessed: 0, quranCompetent: 0
                };
            }
            return breakdownDataMap[key];
        };

        // Initialize with hospital list if All Hospitals
        if (isAllHospitals) {
            hospitalsRes.rows.forEach((h: any) => ensureAndGetTarget({ hospital_id: h.id }));
        }

        totalAggRes.rows.forEach(r => ensureAndGetTarget(r).total += r.count);
        activatedAggRes.rows.forEach(r => ensureAndGetTarget(r).activated += r.count);
        complianceAggRes.rows.forEach(r => ensureAndGetTarget(r).compliance += r.count);

        // Quran Global Metrics (Summed from groups)
        let quranTotalAssessed = 0;
        let quranAdvancedCount = 0;
        let quranCompetentCount = 0;
        let quranTotalSumScore = 0;

        quranAggRes.rows.forEach(r => {
            const target = ensureAndGetTarget(r);
            const exclusiveCompetent = r.competent - r.advanced;

            target.quranAssessed += r.assessed;
            target.quranCompetent += exclusiveCompetent; // Keep exclusive for breakdown table

            quranTotalAssessed += r.assessed;
            quranAdvancedCount += r.advanced;
            quranCompetentCount += exclusiveCompetent; // Keep exclusive for global stats
            quranTotalSumScore += r.sum_score;
        });

        const quranBasicCount = quranTotalAssessed - (quranAdvancedCount + quranCompetentCount);
        const quranIndex = quranTotalAssessed > 0 ? Math.round(quranTotalSumScore / quranTotalAssessed) : 0;

        // Global Totals
        const totalEmployees = totalAggRes.rows.reduce((s, r) => s + r.count, 0);
        const activatedCount = activatedAggRes.rows.reduce((s, r) => s + r.count, 0);
        const mentorCount = mentorsAggRes.rows.reduce((s, r) => s + r.count, 0);
        const complianceCount = complianceAggRes.rows.reduce((s, r) => s + r.count, 0);

        const stats = {
            totalEmployees,
            activatedCount,
            mentorCount,
            complianceCount,
            notActivatedCount: totalEmployees - activatedCount,
            activationRate: totalEmployees > 0 ? Math.round((activatedCount / totalEmployees) * 100) : 0,
            complianceRate: totalEmployees > 0 ? Math.round((complianceCount / totalEmployees) * 100) : 0,

            quranStats: {
                totalAssessed: quranTotalAssessed,
                competentCount: quranCompetentCount,
                advancedCount: quranAdvancedCount,
                basicCount: quranBasicCount,
                indexScore: quranIndex,
                competentRate: quranTotalAssessed > 0 ? Math.round((quranCompetentCount / quranTotalAssessed) * 100) : 0,
                advancedRate: quranTotalAssessed > 0 ? Math.round((quranAdvancedCount / quranTotalAssessed) * 100) : 0,
                basicRate: quranTotalAssessed > 0 ? Math.round((quranBasicCount / quranTotalAssessed) * 100) : 0
            },

            hospitalBreakdown: Object.values(breakdownDataMap)
        };

        return NextResponse.json(stats);

    } catch (error: any) {
        console.error('❌ [API] Analytics Stats Error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
