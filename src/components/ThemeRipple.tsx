'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
    theme: 'dark' | 'light';
    toggleTheme: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (storedTheme) {
            setTheme(storedTheme);
            document.documentElement.classList.toggle('dark', storedTheme === 'dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTheme = theme === 'light' ? 'dark' : 'light';

        // View Transitions API support check
        if (!document.startViewTransition) {
            setTheme(newTheme);
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
            localStorage.setItem('theme', newTheme);
            return;
        }

        const transition = document.startViewTransition(() => {
            setTheme(newTheme);
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
            localStorage.setItem('theme', newTheme);
        });

        transition.ready.then(() => {
            // Hardcoded Top-Right Origin as requested
            const x = window.innerWidth;
            const y = 0;

            // Calculate distance to the furthest corner (Bottom-Left)
            const right = window.innerWidth - x;
            const bottom = window.innerHeight - y;
            const radius = Math.hypot(
                Math.max(x, right),
                Math.max(y, bottom)
            );

            // Animate the clip-path of the NEW view
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${radius}px at ${x}px ${y}px)`,
                    ],
                },
                {
                    duration: 1000, // 1s duration
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)', // "Water-like" easing
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
