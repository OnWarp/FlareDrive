import {
  Divider,
  InputAdornment,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
} from "@mui/material";
import { useState } from "react";
import {
  MoreHoriz as MoreHorizIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useT } from "./i18n";
import { IconTip } from "./ui";

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
      <IconTip title={t("nav.more")} onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreHorizIcon />
      </IconTip>
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
          sx={{ color: "error.main" }}
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
