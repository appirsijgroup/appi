import React, { useState, useEffect } from 'react';
import { useAppDataStore, useUIStore } from '@/store/store';
import { Save, AlertCircle, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ProfileUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MandatoryProfileUpdate: React.FC<ProfileUpdateModalProps> = ({ isOpen, onClose }) => {
    const { loggedInEmployee, loadLoggedInEmployee } = useAppDataStore();
    const { addToast } = useUIStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Flag agar form tidak ter-reset saat loggedInEmployee berubah references-nya
    const [isInitialized, setIsInitialized] = useState(false);

    // State untuk form
    const [formData, setFormData] = useState({
        nik: '',
        phone_number: '',
        address: '',
        birth_place: '',
        birth_date: '',
        unit: '',
        bagian: '',
        employment_status: 'Pegawai Tetap',
        profession_category: 'NON MEDIS',
        profession: '',
        gender: 'Laki-laki'
    });

    useEffect(() => {
        // Reset initialization flag when modal closes
        if (!isOpen) {
            setIsInitialized(false);
            return;
        }

        // Only initialize ONCE when opening modal
        if (loggedInEmployee && isOpen && !isInitialized) {
            setFormData({
                nik: loggedInEmployee.nik || '',
                phone_number: loggedInEmployee.phoneNumber || '',
                address: loggedInEmployee.address || '',
                // Pastikan format YYYY-MM-DD untuk input type="date"
                birth_date: loggedInEmployee.birthDate
                    ? new Date(loggedInEmployee.birthDate).toISOString().split('T')[0]
                    : '',
                birth_place: loggedInEmployee.birthPlace || '',
                unit: loggedInEmployee.unit || '',
                bagian: loggedInEmployee.bagian || '',
                employment_status: loggedInEmployee.employmentStatus || 'Pegawai Tetap',
                profession_category: loggedInEmployee.professionCategory || 'NON MEDIS',
                profession: loggedInEmployee.profession || '',
                gender: loggedInEmployee.gender || 'Laki-laki'
            });
            setIsInitialized(true);
        }
    }, [loggedInEmployee, isOpen, isInitialized]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi
        if (!formData.nik || !formData.phone_number || !formData.address ||
            !formData.birth_date || !formData.birth_place || !formData.unit ||
            !formData.bagian || !formData.profession || !formData.profession_category || !formData.gender || !formData.employment_status) {
            setError('Mohon lengkapi SEMUA kolom data diri dan kepegawaian.');
            return;
        }

        if (formData.nik.length < 16) {
            setError('NIK harus 16 digit sesuai KTP.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Gunakan fetch langsung agar sesuai dengan nama kolom database (snake_case)
            const response = await fetch('/api/employees/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: loggedInEmployee?.id,
                    nik: formData.nik,
                    phone_number: formData.phone_number,
                    address: formData.address,
                    birth_date: formData.birth_date,
                    birth_place: formData.birth_place,
                    unit: formData.unit,
                    bagian: formData.bagian,
                    employment_status: formData.employment_status,
                    profession_category: formData.profession_category,
                    profession: formData.profession,
                    gender: formData.gender,
                    // Penanda bahwa data sudah dilengkapi
                    is_profile_complete: true
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Gagal menyimpan data');
            }

            addToast('Data berhasil diperbarui!', 'success');

            // Tutup modal segera agar UI responsif
            onClose();

            // Reload data user di background
            await loadLoggedInEmployee();

        } catch (err) {
            console.error('Update profile error:', err);
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data.');
            // Jika error, jangan close modal
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !loggedInEmployee) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Modern Header - Clean & Minimalist */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Lengkapi Profil Anda
                        </h2>
                    </div>
                </div>

                {/* Form Content - Scrollable */}
                <form onSubmit={handleSubmit} className="px-8 py-6 overflow-y-auto grow custom-scrollbar">

                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <div className="space-y-8">
                        {/* SECTION 1: DATA PRIBADI */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Identitas Diri</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-4">
                                {/* NIK */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">NIK (KTP) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="nik"
                                        value={formData.nik}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 16) handleChange({ ...e, target: { ...e.target, name: 'nik', value: val } });
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                                        placeholder="16 digit NIK"
                                        required
                                    />
                                </div>

                                {/* No HP */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">No HP / WhatsApp <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                                        placeholder="Contoh: 0812..."
                                        required
                                    />
                                </div>

                                {/* Jenis Kelamin */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jenis Kelamin <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium appearance-none"
                                            required
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Tempat Lahir */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tempat Lahir <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="birth_place"
                                        value={formData.birth_place}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                                        placeholder="Kota Kelahiran"
                                        required
                                    />
                                </div>

                                {/* Tanggal Lahir (Full Width on Mobile) */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tanggal Lahir <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium"
                                        required
                                    />
                                </div>

                                {/* Alamat (Full Width) */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Alamat Domisili <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 resize-none font-medium"
                                        placeholder="Nama Jalan, RT/RW, Kelurahan, Kecamatan..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: DATA KEPEGAWAIAN */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Data Kepegawaian</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-4">
                                {/* Unit */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Unit Kerja <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                                        placeholder="Contoh: Rawat Inap"
                                        required
                                    />
                                </div>

                                {/* Bagian */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bagian <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="bagian"
                                        value={formData.bagian}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                                        placeholder="Contoh: Keperawatan"
                                        required
                                    />
                                </div>

                                {/* Status Kepegawaian */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status Pegawai <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            name="employment_status"
                                            value={formData.employment_status}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium appearance-none"
                                            required
                                        >
                                            <option value="Pegawai Tetap">Pegawai Tetap</option>
                                            <option value="Kontrak">Kontrak</option>
                                            <option value="Mitra">Mitra</option>
                                            <option value="Part Time">Part Time</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Kategori */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Kategori <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            name="profession_category"
                                            value={formData.profession_category}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium appearance-none"
                                            required
                                        >
                                            <option value="MEDIS">MEDIS</option>
                                            <option value="NON MEDIS">NON MEDIS</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Profesi (Full Width) */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jabatan / Profesi <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="profession"
                                        value={formData.profession}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                                        placeholder="Contoh: Staff IT, Perawat Pelaksana"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </form>

                {/* Footer Action */}
                <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-4 shrink-0 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-8 py-2.5 bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
