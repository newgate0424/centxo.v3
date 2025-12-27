import { toast } from "sonner";
import { X } from "lucide-react";
import React from "react";

// Toast colors using "primary" theme color
const colors = {
    toast: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30',
    toastIcon: 'bg-primary/20 dark:bg-primary/30',
    toastClose: 'text-primary/60 hover:text-primary dark:text-primary/60 dark:hover:text-primary',
    toastProgress: 'bg-primary'
};

export const showCustomToast = (message: string, duration = 4000) => {
    toast.custom((tid) => (
        <div className={`${colors.toast} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[320px] relative overflow-hidden border`}>
            <div className={`flex-shrink-0 ${colors.toastIcon} p-1.5 rounded-full`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            </div>
            <span className="font-medium flex-1 text-sm">{message}</span>
            <button onClick={() => toast.dismiss(tid)} className={`${colors.toastClose} transition-colors`}>
                <X className="w-4 h-4" />
            </button>
            <div
                className={`absolute bottom-0 left-0 h-1 ${colors.toastProgress}`}
                style={{
                    width: '100%',
                    animation: `shrinkWidth ${duration}ms linear forwards`
                }}
            />
            <style jsx>{`
                @keyframes shrinkWidth {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    ), { duration });
};
