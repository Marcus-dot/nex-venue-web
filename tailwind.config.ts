import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: "#D8D9D4",
                    dark: "#222551"
                },
                accent: {
                    DEFAULT: "#e85c29",
                    hover: "#d44d1e",
                },
                surface: {
                    DEFAULT: "#ffffff",
                    secondary: "#f3f4f6",
                    dark: "#374151",
                    "dark-secondary": "#1f2937"
                },
                text: {
                    DEFAULT: "#1f2937",
                    secondary: "#6b7280",
                    dark: "#ffffff",
                    "dark-secondary": "#d1d5db"
                },
                border: {
                    DEFAULT: "#e5e7eb",
                    dark: "#374151"
                },
                success: "#10b981",
                warning: "#f59e0b",
                error: "#ef4444",
                info: "#3b82f6",
            },
            fontFamily: {
                rubik: ["var(--font-rubik)", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "premium-gradient": "linear-gradient(135deg, #222551 0%, #3e4491 100%)",
                "orange-gradient": "linear-gradient(135deg, #e85c29 0%, #ff8c5f 100%)",
            },
            boxShadow: {
                "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            },
        },
    },
    plugins: [],
};
export default config;
