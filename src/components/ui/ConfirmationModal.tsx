import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    confirmColorClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Ya, Konfirmasi",
    confirmColorClass = "bg-red-600 hover:bg-red-500"
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-100 animate-fade-in">
            <div className="bg-indigo-950/90 backdrop-blur-2xl rounded-4xl shadow-2xl p-8 w-full max-w-md border border-white/10 animate-pop-in">
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{title}</h3>
                <div className="text-indigo-200/80 font-medium leading-relaxed mb-8">{message}</div>
                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold transition-all active:scale-95">Batal</button>
                    <button onClick={onConfirm} className={`flex-1 px-6 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${confirmColorClass}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
