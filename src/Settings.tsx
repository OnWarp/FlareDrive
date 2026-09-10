import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useAppearance, type Appearance } from "./appearance";
import { useLocale, useT } from "./i18n";
import type { Locale } from "./i18n/types";
import StoragePanel from "./StorageSettings";
import { IconTip, SETTINGS_MAX, Section, useCompactScreen } from "./ui";

const VERSION = "0.2.0";
const GITHUB = "https://github.com/OnWarp/FlareDrive";

type Page = "root" | "language" | "theme";

export default function Settings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const compact = useCompactScreen();
  const t = useT();
  const { appearance, setAppearance } = useAppearance();
  const { locale, setLocale } = useLocale();
  const [page, setPage] = useState<Page>("root");
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const davUrl = `${origin}/dav`;

  useEffect(() => {
    if (open) setPage("root");
  }, [open]);

  const title =
    page === "language"
      ? t("settings.language")
      : page === "theme"
        ? t("settings.themeLabel")
        : t("settings.title");

  const themeLabel =
    appearance === "light"
      ? t("settings.theme.light")
      : appearance === "dark"
        ? t("settings.theme.dark")
        : t("settings.theme.system");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={compact}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: compact ? 0 : "16px",
          maxWidth: compact ? "100%" : SETTINGS_MAX,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, px: 2 }}>
        {page !== "root" && (
          <IconTip title={t("common.cancel")} onClick={() => setPage("root")} edge="start">
            <ArrowBackIcon />
          </IconTip>
        )}
        {title}
        <Box sx={{ ml: "auto" }}>
          <IconTip title={t("common.cancel")} onClick={onClose}>
            <CloseIcon />
          </IconTip>
        </Box>
      </DialogTitle>

      {page === "root" && (
        <Box sx={{ pb: 1 }}>
          <Section title={t("settings.appearance")}>
            <List disablePadding>
              <ListItemButton onClick={() => setPage("language")}>
                <ListItemText
                  primary={t("settings.language")}
                  secondary={locale === "zh-CN" ? t("lang.zh") : t("lang.en")}
                />
                <ChevronRightIcon color="action" />
              </ListItemButton>
              <ListItemButton onClick={() => setPage("theme")}>
                <ListItemText
                  primary={t("settings.themeLabel")}
                  secondary={themeLabel}
                />
                <ChevronRightIcon color="action" />
              </ListItemButton>
            </List>
          </Section>

          <Section title={t("settings.storage")}>
            <StoragePanel />
          </Section>

          <Section title={t("settings.webdav")}>
            <List disablePadding>
              <ListItemButton>
                <ListItemText
                  primary={t("settings.webdav.endpoint")}
                  secondary={davUrl}
                  secondaryTypographyProps={{ sx: { wordBreak: "break-all" } }}
                />
                <Button
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await navigator.clipboard.writeText(davUrl);
                    setCopied(true);
                  }}
                >
                  {t("settings.webdav.copy")}
                </Button>
              </ListItemButton>
            </List>
          </Section>

          <Section title={t("settings.about")}>
            <List disablePadding>
              <ListItemButton disabled>
                <ListItemText
                  primary={t("app.name")}
                  secondary={t("settings.about.version", { version: VERSION })}
                />
              </ListItemButton>
              <ListItemButton
                component="a"
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ListItemText primary={t("settings.about.github")} secondary={GITHUB} />
                <ChevronRightIcon color="action" />
              </ListItemButton>
            </List>
          </Section>
        </Box>
      )}

      {page === "language" && (
        <Box sx={{ maxWidth: SETTINGS_MAX, mx: "auto", width: "100%", pb: 2 }}>
          <List disablePadding>
            {(["zh-CN", "en-US"] as Locale[]).map((code) => (
              <ListItemButton
                key={code}
                selected={locale === code}
                onClick={() => setLocale(code)}
                sx={{ minHeight: 56, px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CheckIcon
                    fontSize="small"
                    sx={{ visibility: locale === code ? "visible" : "hidden" }}
                  />
                </ListItemIcon>
                <ListItemText>
                  {code === "zh-CN" ? t("lang.zh") : t("lang.en")}
                </ListItemText>
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      {page === "theme" && (
        <Box sx={{ maxWidth: SETTINGS_MAX, mx: "auto", width: "100%", pb: 2 }}>
          <List disablePadding>
            {(
              [
                ["system", "settings.theme.system"],
                ["light", "settings.theme.light"],
                ["dark", "settings.theme.dark"],
              ] as const
            ).map(([value, key]) => (
              <ListItemButton
                key={value}
                selected={appearance === value}
                onClick={() => setAppearance(value as Appearance)}
                sx={{ minHeight: 56, px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CheckIcon
                    fontSize="small"
                    sx={{
                      visibility: appearance === value ? "visible" : "hidden",
                    }}
                  />
                </ListItemIcon>
                <ListItemText>{t(key)}</ListItemText>
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message={t("settings.webdav.copied")}
      />
    </Dialog>
  );
}
