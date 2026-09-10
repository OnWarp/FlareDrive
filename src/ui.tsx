import type { MouseEvent, ReactNode } from "react";
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";

export const SETTINGS_MAX = 760;
export const ROW_SX = {
  minHeight: 56,
  px: 2,
  borderRadius: 0,
  "& .MuiListItemIcon-root": { minWidth: 40 },
};

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ px: 2, pb: 2.5, maxWidth: SETTINGS_MAX, mx: "auto", width: "100%" }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", px: 0.5, pb: 0.75, letterSpacing: 0.6 }}
      >
        {title}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: "16px",
          overflow: "hidden",
          "& .MuiListItemButton-root": ROW_SX,
          "& .MuiListItemButton-root:not(:last-of-type)": {
            borderBottom: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

export function DesktopTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const desktop = useMediaQuery("(hover: hover) and (pointer: fine)");
  if (!desktop) return <>{children}</>;
  return (
    <Tooltip title={title} enterDelay={400}>
      <span>{children}</span>
    </Tooltip>
  );
}

export function IconTip({
  title,
  onClick,
  children,
  edge,
}: {
  title: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  edge?: "start" | "end";
}) {
  return (
    <DesktopTooltip title={title}>
      <IconButton aria-label={title} onClick={onClick} edge={edge} color="inherit">
        {children}
      </IconButton>
    </DesktopTooltip>
  );
}
