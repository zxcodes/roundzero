import { ScriptOnce } from "@tanstack/react-router";
import { createContext, type PropsWithChildren, use, useEffect, useState } from "react";

import {
  applyThemeClass,
  getStoredTheme,
  setStoredTheme,
  type Theme,
  themeScript,
} from "@/lib/theme";

type ThemeContextVal = { theme: Theme; setTheme: (val: Theme) => void };
type Props = PropsWithChildren<{ forceLight?: boolean }>;

const ThemeContext = createContext<ThemeContextVal | null>(null);

export function ThemeProvider({ children, forceLight = false }: Props) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyThemeClass(forceLight ? "light" : stored);
  }, [forceLight]);

  function setTheme(val: Theme) {
    setStoredTheme(val);
    setThemeState(val);
    if (!forceLight) {
      applyThemeClass(val);
    }
  }

  return (
    <>
      <ScriptOnce>{themeScript}</ScriptOnce>
      <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
    </>
  );
}

export function useTheme() {
  const val = use(ThemeContext);
  if (!val) throw new Error("useTheme called outside of ThemeProvider!");
  return val;
}
