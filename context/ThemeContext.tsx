"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface ThemeContextValue {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    isDark: false,
    toggleTheme: () => {},
    setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [isDark, setIsDark] = useState(false);

    // On mount: read from localStorage to prevent flash on reload
    useEffect(() => {
        const stored = localStorage.getItem("nex_dark_mode");
        if (stored === "true") {
            setIsDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    const applyTheme = useCallback((dark: boolean) => {
        if (dark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("nex_dark_mode", String(dark));
        setIsDark(dark);
    }, []);

    const toggleTheme = useCallback(() => {
        applyTheme(!isDark);
    }, [isDark, applyTheme]);

    const setTheme = useCallback((dark: boolean) => {
        applyTheme(dark);
    }, [applyTheme]);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
