import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "dark" | "light" | "blue-white" | "green-white" | "dark-blue" | "dark-green";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("powercode_theme");
    return (saved as Theme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("powercode_theme", theme);
    const body = document.body;
    
    // Remove all theme classes first
    body.classList.remove("light-mode", "theme-dark", "theme-light", "theme-blue-white", "theme-green-white", "theme-dark-blue", "theme-dark-green");
    
    // Add active theme class
    body.classList.add(`theme-${theme}`);
    
    // Set legacy light-mode class for general light-based styling
    if (theme === "light" || theme === "blue-white" || theme === "green-white") {
      body.classList.add("light-mode");
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const list: Theme[] = ["dark", "light", "blue-white", "green-white", "dark-blue", "dark-green"];
      const nextIdx = (list.indexOf(prev) + 1) % list.length;
      return list[nextIdx];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
