import { DailyActivity } from "@/types";

export const DAILY_ACTIVITIES: DailyActivity[] = [
    // SIDIQ (Integritas)
    {
        id: "infaq",
        title: "Gemar berinfaq",
        category: "SIDIQ (Integritas)",
        monthlyTarget: 1,
        automationTrigger: { type: 'MANUAL_USER_REPORT' }
    },
    {
        id: "jujur",
        title: "Jujur menyampaikan informasi",
        category: "SIDIQ (Integritas)",
        monthlyTarget: 4,
        automationTrigger: { type: 'MANUAL_USER_REPORT' }
    },
    {
        id: "tanggung_jawab",
        title: "Tanggung jawab terhadap pekerjaan",
        category: "SIDIQ (Integritas)",
        monthlyTarget: 1,
        automationTrigger: { type: 'MANUAL_USER_REPORT' }
    },

    // TABLIGH (Teamwork)
    {
        id: "persyarikatan",
        title: "Aktif dalam kegiatan persyarikatan",
        category: "TABLIGH (Teamwork)",
        monthlyTarget: 1,
        automationTrigger: { type: 'TEAM_ATTENDANCE', value: 'Pengajian Persyarikatan' }
    },
    {
        id: "doa_bersama",
        title: "Doa bersama mengawali pekerjaan",
        category: "TABLIGH (Teamwork)",
        monthlyTarget: 20,
        automationTrigger: { type: 'TEAM_ATTENDANCE', value: 'Doa Bersama' }
    },
    {
        id: "lima_s",
        title: "5S (Salam, Senyum, Sapa, Sopan, Santun)",
        category: "TABLIGH (Teamwork)",
        monthlyTarget: 20,
        automationTrigger: { type: 'MANUAL_USER_REPORT' }
    },

    // AMANAH (Disiplin)
    {
        id: "shalat_berjamaah",
        title: "Sholat lima waktu berjamaah",
        category: "AMANAH (Disiplin)",
        monthlyTarget: 20,
        automationTrigger: { type: 'PRAYER_WAJIB' }
    },
    {
        id: "penampilan_diri",
        title: "Menjaga penampilan diri",
        category: "AMANAH (Disiplin)",
        monthlyTarget: 20,
        automationTrigger: { type: 'MANUAL_USER_REPORT' }
    },
    {
        id: "tepat_waktu_kie",
        title: "Tepat waktu menghadiri KIE",
        category: "AMANAH (Disiplin)",
        monthlyTarget: 1,
        automationTrigger: { type: 'TEAM_ATTENDANCE', value: 'KIE' }
    },

    // FATONAH (Belajar)
    {
        id: "tadarus",
        title: "RSIJ bertadarus (berkelompok)",
        category: "FATONAH (Belajar)",
        monthlyTarget: 3,
        automationTrigger: { type: 'TADARUS_SESSION' }
    },
    {
        id: "kajian_selasa",
        title: "Kajian Selasa",
        category: "FATONAH (Belajar)",
        monthlyTarget: 2,
        automationTrigger: { type: 'TEAM_ATTENDANCE', value: 'Kajian Selasa' }
    },
    {
        id: "baca_alquran_buku",
        title: "Membaca Al-Quran dan buku",
        category: "FATONAH (Belajar)",
        monthlyTarget: 20,
        automationTrigger: { type: 'BOOK_READING_REPORT' }
    }
];
