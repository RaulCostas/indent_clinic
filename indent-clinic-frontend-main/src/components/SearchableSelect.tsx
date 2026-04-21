import React, { useState, useRef, useEffect } from 'react';

interface Option {
    id: number | string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: number | string;
    onChange: (id: number | string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    icon?: React.ReactNode;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = '-- Seleccione una opción --',
    className = '',
    disabled = false,
    required = false,
    icon
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => String(opt.id) === String(value));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (id: number | string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                className={`flex items-center w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {icon && <span className="mr-2 text-gray-400">{icon}</span>}
                <div className="flex-1 truncate">
                    {selectedOption ? selectedOption.label : <span className="text-gray-400">{placeholder}</span>}
                </div>
                <svg
                    className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-[1050] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-100">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            className="w-full px-3 py-1.5 text-sm rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <li
                                    key={opt.id}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${String(value) === String(opt.id) ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(opt.id);
                                    }}
                                >
                                    <div>{opt.label}</div>
                                    {opt.subLabel && <div className="text-xs text-gray-500 dark:text-gray-400">{opt.subLabel}</div>}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic">No se encontraron resultados</li>
                        )}
                    </ul>
                </div>
            )}
            
            {/* Input oculto para compatibilidad con validación de formularios nativa si fuera necesario */}
            {required && <input type="hidden" value={value || ''} required />}
        </div>
    );
};

export default SearchableSelect;
