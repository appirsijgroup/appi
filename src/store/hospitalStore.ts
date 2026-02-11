
import { create } from 'zustand';
import { Hospital } from '@/types';
import { getAllHospitals } from '@/services/hospitalService';

interface HospitalState {
    hospitalsData: Record<string, Hospital>;
    hospitals: Hospital[]; // Add this
    setHospitalsData: (hospitals: Record<string, Hospital>) => void;
    loadHospitals: () => Promise<void>;
}

export const useHospitalStore = create<HospitalState>((set) => ({
    hospitalsData: {},
    hospitals: [], // Initialize
    setHospitalsData: (hospitals) => set({
        hospitalsData: hospitals,
        hospitals: Object.values(hospitals) // Sync array version
    }),
    loadHospitals: async () => {
        try {
            const hospitals = await getAllHospitals();
            const hospitalsRecord: Record<string, Hospital> = {};
            hospitals.forEach(hospital => {
                hospitalsRecord[hospital.id] = hospital;
            });
            set({
                hospitalsData: hospitalsRecord,
                hospitals: hospitals // Store array version
            });
        } catch (error) {
            console.error('Failed to load hospitals:', error);
        }
    },
}));
