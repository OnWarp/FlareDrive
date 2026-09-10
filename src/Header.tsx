import { IconButton, InputBase, Menu, MenuItem, Toolbar } from "@mui/material";
import { useState } from "react";
import { MoreHoriz as MoreHorizIcon } from "@mui/icons-material";
import { LanguageToggle, useT } from "./i18n";

function Header({
  search,
  onSearchChange,
  setShowProgressDialog,
  onLogout,
}: {
  search: string;
  onSearchChange: (newSearch: string) => void;
  setShowProgressDialog: (show: boolean) => void;
  onLogout: () => void;
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
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "whitesmoke",
          borderRadius: "999px",
          padding: "8px 16px",
        }}
      />
      <LanguageToggle />
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
        <MenuItem disabled>{t("nav.viewAs")}</MenuItem>
        <MenuItem disabled>{t("nav.sortBy")}</MenuItem>
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
