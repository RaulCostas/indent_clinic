import React from 'react';
import { Check, X } from 'lucide-react';

interface SiNoSelectorProps {
    name: string;
    value: boolean | string | number | undefined;
    onChange: (name: string, value: boolean) => void;
    label: string;
}

const SiNoSelector: React.FC<SiNoSelectorProps> = ({ name, value, onChange, label }) => {
    // Determine if the value is "true" or truthy
    const isSi = value === true || value === 'true' || Number(value) === 1;
    const isNo = value === false || value === 'false' || (value !== undefined && value !== null && Number(value) === 0);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800/10 gap-3 group">
            <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors flex-1">
                {label}
            </span>
            <div className="flex items-center p-0.5 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg w-fit self-end sm:self-auto border border-gray-200 dark:border-gray-700/50">
                <button
                    type="button"
                    onClick={() => onChange(name, true)}
                    className={`flex items-center gap-1 px-3.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${
                        isSi 
                        ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/20' 
                        : 'bg-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                >
                    {isSi && <Check size={12} strokeWidth={3} />}
                    SÍ
                </button>
                <button
                    type="button"
                    onClick={() => onChange(name, false)}
                    className={`flex items-center gap-1 px-3.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${
                        isNo 
                        ? 'bg-slate-500 text-white shadow-sm ring-1 ring-slate-600/20' 
                        : 'bg-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                >
                    {isNo && <X size={12} strokeWidth={3} />}
                    NO
                </button>
            </div>
        </div>
    );
};

export default SiNoSelector;
