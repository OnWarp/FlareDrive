import { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { useAppearance, type Appearance } from "./appearance";
import { useLocale, useT } from "./i18n";
import type { Locale } from "./i18n/types";
import { IconTip, SETTINGS_MAX, Section, useCompactScreen } from "./ui";
import { humanReadableSize } from "./app/utils";

const VERSION = "0.2.0";
const GITHUB = "https://github.com/OnWarp/FlareDrive";

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
  const [copied, setCopied] = useState(false);
  const [langEl, setLangEl] = useState<null | HTMLElement>(null);
  const [themeEl, setThemeEl] = useState<null | HTMLElement>(null);
  const [usage, setUsage] = useState<{
    usedBytes: number;
    quotaBytes: number;
  } | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const davUrl = `${origin}/dav`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/storage/usage", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { usedBytes?: number; quotaBytes?: number }) => {
        if (cancelled) return;
        if (typeof data.usedBytes === "number" && typeof data.quotaBytes === "number") {
          setUsage({ usedBytes: data.usedBytes, quotaBytes: data.quotaBytes });
        }
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
          overflow: "hidden",
          maxWidth: compact ? "100%" : SETTINGS_MAX,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, px: 2 }}>
        {t("settings.title")}
        <Box sx={{ ml: "auto" }}>
          <IconTip title={t("common.cancel")} onClick={onClose}>
            <CloseIcon />
          </IconTip>
        </Box>
      </DialogTitle>

      <Box sx={{ pb: 1, overflow: "auto" }}>
        <Section title={t("settings.appearance")}>
          <List disablePadding>
            <ListItemButton onClick={(e) => setLangEl(e.currentTarget)}>
              <ListItemText
                primary={t("settings.language")}
                secondary={locale === "zh-CN" ? t("lang.zh") : t("lang.en")}
              />
            </ListItemButton>
            <ListItemButton onClick={(e) => setThemeEl(e.currentTarget)}>
              <ListItemText
                primary={t("settings.themeLabel")}
                secondary={themeLabel}
              />
            </ListItemButton>
          </List>
        </Section>

        <Section title={t("settings.storage")}>
          <List disablePadding>
            <ListItem
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                py: 1.5,
                px: 2,
                minHeight: 56,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  sx={{ m: 0 }}
                  primary={t("settings.storage.r2")}
                  secondary={t("settings.storage.r2Name")}
                />
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {usage
                    ? t("settings.storage.usage", {
                        used: humanReadableSize(usage.usedBytes),
                        total: humanReadableSize(usage.quotaBytes),
                      })
                    : "…"}
                </Typography>
              </Box>
              <LinearProgress
                variant={usage ? "determinate" : "indeterminate"}
                value={
                  usage && usage.quotaBytes > 0
                    ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
                    : 0
                }
                color={
                  usage && usage.quotaBytes > 0 && usage.usedBytes / usage.quotaBytes >= 0.9
                    ? "warning"
                    : "primary"
                }
                sx={{ height: 6, borderRadius: 3 }}
              />
            </ListItem>
          </List>
        </Section>

        <Section title={t("settings.webdav")}>
          <List disablePadding>
            <ListItemButton>
              <ListItemText
                primary={t("settings.webdav.endpoint")}
                secondary={davUrl}
                secondaryTypographyProps={{ sx: { wordBreak: "break-all" } }}
              />
              <IconTip
                title={t("settings.webdav.copy")}
                onClick={async (e) => {
                  e.stopPropagation();
                  await navigator.clipboard.writeText(davUrl);
                  setCopied(true);
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconTip>
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
            </ListItemButton>
          </List>
        </Section>
      </Box>

      <Menu anchorEl={langEl} open={Boolean(langEl)} onClose={() => setLangEl(null)}>
        {(["zh-CN", "en-US"] as Locale[]).map((code) => (
          <MenuItem
            key={code}
            selected={locale === code}
            onClick={() => {
              setLocale(code);
              setLangEl(null);
            }}
          >
            <ListItemIcon>
              <CheckIcon
                fontSize="small"
                sx={{ visibility: locale === code ? "visible" : "hidden" }}
              />
            </ListItemIcon>
            {code === "zh-CN" ? t("lang.zh") : t("lang.en")}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={themeEl} open={Boolean(themeEl)} onClose={() => setThemeEl(null)}>
        {(
          [
            ["system", "settings.theme.system"],
            ["light", "settings.theme.light"],
            ["dark", "settings.theme.dark"],
          ] as const
        ).map(([value, key]) => (
          <MenuItem
            key={value}
            selected={appearance === value}
            onClick={() => {
              setAppearance(value as Appearance);
              setThemeEl(null);
            }}
          >
            <ListItemIcon>
              <CheckIcon
                fontSize="small"
                sx={{
                  visibility: appearance === value ? "visible" : "hidden",
                }}
              />
            </ListItemIcon>
            {t(key)}
          </MenuItem>
        ))}
      </Menu>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message={t("settings.webdav.copied")}
      />
    </Dialog>
  );
}
