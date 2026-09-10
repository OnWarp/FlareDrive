import { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { useAppearance, type Appearance } from "./appearance";
import { useLocale, useT } from "./i18n";
import type { Locale } from "./i18n/types";
import StoragePanel from "./StorageSettings";
import { IconTip, SETTINGS_MAX, Section, useCompactScreen } from "./ui";

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
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const davUrl = `${origin}/dav`;

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
