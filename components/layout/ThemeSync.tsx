"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

/**
 * Syncs the user's saved darkMode preference from Firestore to ThemeContext.
 * Placed inside both ThemeProvider and AuthProvider so it can access both.
 */
export const ThemeSync = () => {
    const { profile } = useAuth();
    const { setTheme } = useTheme();

    useEffect(() => {
        if (profile?.settings?.darkMode !== undefined) {
            setTheme(profile.settings.darkMode);
        }
    }, [profile?.settings?.darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
};
