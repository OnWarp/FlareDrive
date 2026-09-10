import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  Typography,
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

const VERSION = "0.2.0";
const GITHUB = "https://github.com/OnWarp/FlareDrive";

type Page = "root" | "language" | "theme";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ px: 1, py: 1 }}
      >
        {title}
      </Typography>
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        {children}
      </Paper>
    </Box>
  );
}

export default function Settings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {page !== "root" && (
          <IconButton onClick={() => setPage("root")} edge="start">
            <ArrowBackIcon />
          </IconButton>
        )}
        {title}
        <IconButton
          onClick={onClose}
          sx={{ ml: "auto" }}
          aria-label={t("common.cancel")}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {page === "root" && (
        <>
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
            <List disablePadding>
              <ListItemButton disabled>
                <ListItemText
                  primary={t("settings.storage.r2")}
                  secondary={t("settings.storage.r2Name")}
                />
                <Typography variant="body2" color="success.main">
                  {t("settings.storage.connected")}
                </Typography>
              </ListItemButton>
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
        </>
      )}

      {page === "language" && (
        <List>
          {(["zh-CN", "en-US"] as Locale[]).map((code) => (
            <ListItemButton
              key={code}
              selected={locale === code}
              onClick={() => setLocale(code)}
            >
              <ListItemIcon>
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
      )}

      {page === "theme" && (
        <List>
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
            >
              <ListItemIcon>
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
