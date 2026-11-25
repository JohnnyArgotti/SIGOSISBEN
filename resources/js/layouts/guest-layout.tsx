import { ReactNode } from 'react';

export default function GuestLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* HEADER */}
            <div className="bg-gray-400 dark:bg-gray-800 h-16 flex items-center justify-between px-4 md:px-6 shadow">
                <img src="/img/Logo propuesto SIGO-SISBEN.png" alt="Logo SIGO-SISBEN" className="h-10 md:h-12" />
                <img src="/img/logo_alcadia.svg" alt="Logo Alcaldía" className="h-8 md:h-10 w-auto object-contain" />
            </div>
            {/* CONTENT */}
            <div className="flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}
