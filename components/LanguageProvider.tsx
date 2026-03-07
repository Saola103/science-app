"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "ja" | "en";
type Theme = "dark" | "light";

interface AppContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    toggleTheme: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (ja: any, en: any) => any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>("ja");
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle("dark", savedTheme === "dark");
        } else {
            // Default to dark as per user's earlier preference
            document.documentElement.classList.add("dark");
        }

        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang) setLanguage(savedLang);
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem("language", lang);
    };

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (ja: any, en: any) => (language === "ja" ? ja : en);

    return (
        <AppContext.Provider value={{ language, setLanguage: handleSetLanguage, theme, toggleTheme, t }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
}

// Mirroring the old exports for backward compatibility if needed, 
// though I'll update the rest of the app to use useApp.
export { AppProvider as LanguageProvider };
export { useApp as useLanguage };
