
const XLSX = require('xlsx');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runBulkUpdate() {
    try {
        const filePath = path.join(process.cwd(), 'data_update.xlsx');
        console.log(`\n📂 Membaca file: ${filePath}`);

        // 1. Read Excel File
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📊 Total baris ditemukan: ${data.length}`);
        console.log(`⏳ Memulai pemrosesan...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const nip = String(row.nip || '').trim();
            const hospitalId = String(row.hospital_id || '').trim().toUpperCase();
            const isMentor = String(row.is_mentor || '').toUpperCase() === 'YA';
            const isKaUnit = String(row.is_ka_unit || '').toUpperCase() === 'YA';

            if (!nip) {
                console.warn(`⚠️ Baris tanpa NIP dilewati.`);
                continue;
            }

            try {
                // Build Query: Mengamankan NIP Ganda dengan filter Hospital ID
                let params = [nip, isMentor, isKaUnit];

                let hospitalCriteria = '';
                if (hospitalId) {
                    hospitalCriteria = `AND hospital_id = $4`;
                    params.push(hospitalId);
                } else {
                    // Jika ada NIP ganda antar RS dan ID RS di Excel kosong, 
                    // script ini akan menolak update demi keamanan.
                    hospitalCriteria = `AND 1=0`; // Paksa gagal jika RS tidak diisi
                    console.warn(`⚠️ [${nip}] GAGAL: ID RS (hospital_id) wajib diisi untuk menghindari NIP ganda.`);
                }

                const sql = `
                    UPDATE employees 
                    SET can_be_mentor = $2, can_be_ka_unit = $3, updated_at = NOW()
                    WHERE id = $1 ${hospitalCriteria}
                    RETURNING id, name, hospital_id
                `;

                const res = await pool.query(sql, params);

                if (res.rows.length > 0) {
                    const emp = res.rows[0];
                    console.log(`✅ [${nip}] [${emp.hospital_id}] ${emp.name} -> Terupdate.`);
                    successCount++;
                } else {
                    if (hospitalId) {
                        console.error(`❌ [${nip}] [${hospitalId}] Gagal: NIP & RS tidak cocok di database.`);
                    }
                    errorCount++;
                }
            } catch (e) {
                console.error(`❌ [${nip}] Error:`, e.message);
                errorCount++;
            }
        }

        console.log(`\n🏁 SELESAI!`);
        console.log(`   - Berhasil Diupdate: ${successCount}`);
        console.log(`   - Gagal/Ditolak: ${errorCount}`);

    } catch (err) {
        console.error('🛑 Gagal menjalankan script:', err.message);
        if (err.message.includes('ENOENT')) {
            console.error('👉 Pastikan file "data_update.xlsx" sudah ada di folder utama.');
        }
    } finally {
        await pool.end();
    }
}

runBulkUpdate();
