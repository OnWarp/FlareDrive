import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createTheme, ThemeProvider, useMediaQuery } from "@mui/material";

export type Appearance = "system" | "light" | "dark";

const STORAGE_KEY = "flare-drive-theme";

const AppearanceContext = createContext<{
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
} | null>(null);

function readAppearance(): Appearance {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "system" || stored === "light" || stored === "dark")
    return stored;
  return "system";
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const setAppearance = (a: Appearance) => {
    setAppearanceState(a);
    localStorage.setItem(STORAGE_KEY, a);
  };
  const mode =
    appearance === "system" ? (prefersDark ? "dark" : "light") : appearance;
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode, primary: { main: "#f38020" } },
        shape: { borderRadius: 16 },
        components: {
          MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
        },
      }),
    [mode]
  );
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside AppearanceProvider");
  return ctx;
}
