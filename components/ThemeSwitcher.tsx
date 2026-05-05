"use client";

import { useEffect, useState } from "react";

type ThemeMode = "auto" | "light" | "dark";
const STORAGE_KEY = "did-you-know-theme";

export default function ThemeSwitcher() {
  const getInitialTheme = (): ThemeMode => {
    if (typeof window === "undefined") return "auto";
    const storedTheme = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return (storedTheme === "light" || storedTheme === "dark" || storedTheme === "auto") ? storedTheme : "auto";
  };

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");

    if (theme === "light") {
      root.classList.add("theme-light");
    } else if (theme === "dark") {
      root.classList.add("theme-dark");
    }

    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="theme-switcher">
      <label htmlFor="theme-select">Thema</label>
      <select
        id="theme-select"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeMode)}
        aria-label="Kies thema: licht, donker of auto"
      >
        <option value="auto">Auto</option>
        <option value="light">Licht</option>
        <option value="dark">Donker</option>
      </select>
    </div>
  );
}
