import { z } from "zod";

const themeSchema = z.union([z.literal("light"), z.literal("dark")]);
export type Theme = z.infer<typeof themeSchema>;

const STORAGE_KEY = "_rz-theme";

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return themeSchema.safeParse(stored).success ? (stored as Theme) : "light";
  } catch {
    return "light";
  }
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const themeScript = `(function() {
  try {
    if (document.documentElement.dataset.forceLight === 'true') {
      document.documentElement.classList.remove('dark');
      return;
    }
    const theme = localStorage.getItem('${STORAGE_KEY}') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})()`;
