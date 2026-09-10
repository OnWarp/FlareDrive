import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { TransferTask, useTransferQueue } from "./app/transferQueue";
import { humanReadableSize } from "./app/utils";
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";
import { useT } from "./i18n";

function ProgressDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [tab, setTab] = useState(0);
  const transferQueue: TransferTask[] = useTransferQueue();

  const tasks = useMemo(() => {
    const taskType = tab === 0 ? "download" : "upload";
    return Object.values(transferQueue).filter(
      (task) => task.type === taskType
    );
  }, [tab, transferQueue]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("progress.title")}</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, newTab) => setTab(newTab)}
        sx={{ "& .MuiTab-root": { flexBasis: "50%" } }}
      >
        <Tab label={t("progress.downloads")} />
        <Tab label={t("progress.uploads")} />
      </Tabs>
      {tasks.length === 0 ? (
        <DialogContent>
          <Typography textAlign="center" color="text.secondary">
            {t("progress.empty")}
          </Typography>
        </DialogContent>
      ) : (
        <DialogContent sx={{ padding: 0 }}>
          <List>
            {tasks.map((task) => (
              <ListItem key={task.name}>
                <ListItemText
                  primary={task.name}
                  secondary={`${humanReadableSize(
                    task.loaded
                  )} / ${humanReadableSize(task.total)}`}
                />
                {task.status === "failed" ? (
                  <Tooltip title={task.error.message}>
                    <ErrorOutlineIcon color="error" />
                  </Tooltip>
                ) : task.status === "completed" ? (
                  <CheckCircleOutlineIcon color="success" />
                ) : task.status === "in-progress" ? (
                  <CircularProgress
                    variant="determinate"
                    size={24}
                    value={(task.loaded / task.total) * 100}
                  />
                ) : null}
              </ListItem>
            ))}
          </List>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default ProgressDialog;
