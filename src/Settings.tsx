import {
  Dialog,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Radio,
  RadioGroup,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useAppearance, type Appearance } from "./appearance";
import { useLocale, useT } from "./i18n";
import type { Locale } from "./i18n/types";

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
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        {t("settings.title")}
        <IconButton onClick={onClose} sx={{ ml: "auto" }} aria-label={t("common.cancel")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <List disablePadding sx={{ pb: 2 }}>
        <ListSubheader>{t("settings.appearance")}</ListSubheader>
        <ListItem>
          <ListItemText
            primary={t("settings.theme")}
            secondary={
              <RadioGroup
                value={appearance}
                onChange={(e) => setAppearance(e.target.value as Appearance)}
              >
                <FormControlLabel
                  value="system"
                  control={<Radio size="small" />}
                  label={t("settings.theme.system")}
                />
                <FormControlLabel
                  value="light"
                  control={<Radio size="small" />}
                  label={t("settings.theme.light")}
                />
                <FormControlLabel
                  value="dark"
                  control={<Radio size="small" />}
                  label={t("settings.theme.dark")}
                />
              </RadioGroup>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t("settings.language")}
            secondary={
              <RadioGroup
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
              >
                <FormControlLabel value="zh-CN" control={<Radio size="small" />} label={t("lang.zh")} />
                <FormControlLabel value="en-US" control={<Radio size="small" />} label={t("lang.en")} />
              </RadioGroup>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
        <Divider />
        <ListSubheader>{t("settings.storage")}</ListSubheader>
        <ListItem>
          <ListItemText
            primary={t("settings.storage.r2")}
            secondary={t("settings.storage.hint")}
          />
        </ListItem>
        <Divider />
        <ListSubheader>{t("settings.webdav")}</ListSubheader>
        <ListItem>
          <ListItemText
            primary={t("settings.webdav.endpoint")}
            secondary={`${origin}/dav`}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t("settings.webdav.legacy")}
            secondary={`${origin}/webdav`}
          />
        </ListItem>
        <ListItem>
          <ListItemText secondary={t("settings.webdav.hint")} />
        </ListItem>
        <Divider />
        <ListSubheader>{t("settings.about")}</ListSubheader>
        <ListItem>
          <ListItemText
            primary={t("app.name")}
            secondary={t("settings.about.blurb")}
          />
        </ListItem>
      </List>
    </Dialog>
  );
}
