import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@mui/material";
import enUS from "./locales/en-US";
import zhCN from "./locales/zh-CN";
import { STORAGE_KEY, type Locale } from "./types";

type Dict = Record<string, string>;

const dicts: Record<Locale, Dict> = { "en-US": enUS, "zh-CN": zhCN };

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
} | null>(null);

function detectLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en-US" || stored === "zh-CN") return stored;
  if (stored === "en") return "en-US";
  if (stored === "zh") return "zh-CN";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = (key: string, params?: Record<string, string | number>): string => {
    let val = dicts[locale][key] ?? dicts["en-US"][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params))
        val = val.replace(`{${k}}`, String(v));
    }
    return val;
  };
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return ctx.t;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <I18nProvider>");
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const next: Locale = locale === "en-US" ? "zh-CN" : "en-US";
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={() => setLocale(next)}
      sx={{
        minWidth: 36,
        height: 36,
        px: { xs: 1, sm: 1.5 },
        borderRadius: "10px",
      }}
    >
      <span className="lang-short">
        {locale === "en-US" ? t("lang.zhShort") : t("lang.enShort")}
      </span>
      <span className="lang-full">
        {locale === "en-US" ? t("lang.zh") : t("lang.en")}
      </span>
    </Button>
  );
}
