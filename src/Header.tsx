import {
  IconButton,
  InputAdornment,
  InputBase,
  Menu,
  MenuItem,
  Divider,
  Toolbar,
} from "@mui/material";
import { useState } from "react";
import {
  MoreHoriz as MoreHorizIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { LanguageMenu, useT } from "./i18n";

function Header({
  search,
  onSearchChange,
  setShowProgressDialog,
  onLogout,
  onSettings,
}: {
  search: string;
  onSearchChange: (newSearch: string) => void;
  setShowProgressDialog: (show: boolean) => void;
  onLogout: () => void;
  onSettings: () => void;
}) {
  const t = useT();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Toolbar disableGutters sx={{ padding: 1, gap: 0.5 }}>
      <InputBase
        size="small"
        fullWidth
        placeholder={t("nav.search")}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        startAdornment={
          <InputAdornment position="start" sx={{ mr: 0.5 }}>
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        }
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "whitesmoke",
          borderRadius: "999px",
          padding: "8px 16px",
        }}
      />
      <LanguageMenu variant="icon" />
      <IconButton
        aria-label={t("nav.more")}
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <MoreHorizIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setShowProgressDialog(true);
          }}
        >
          {t("nav.progress")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onSettings();
          }}
        >
          {t("nav.settings")}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onLogout();
          }}
        >
          {t("nav.logout")}
        </MenuItem>
      </Menu>
    </Toolbar>
  );
}

export default Header;
