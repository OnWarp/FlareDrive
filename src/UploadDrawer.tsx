import React, { forwardRef, useCallback, useMemo, useState } from "react";

import { Button, Card, Drawer, Fab, Grid, Snackbar, Typography } from "@mui/material";
import {
  Camera as CameraIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Image as ImageIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { createFolder } from "./app/transfer";
import { useUploadEnqueue } from "./app/transferQueue";
import { PromptDialog } from "./dialogs";
import { useT } from "./i18n";

function IconCaptionButton({
  icon,
  caption,
  onClick,
}: {
  icon: React.ReactNode;
  caption: string;
  onClick?: () => void;
}) {
  return (
    <Button
      color="inherit"
      sx={{ width: "100%", display: "flex", flexDirection: "column" }}
      onClick={onClick}
    >
      {icon}
      <Typography
        variant="caption"
        sx={{ textTransform: "none", textWrap: "nowrap" }}
      >
        {caption}
      </Typography>
    </Button>
  );
}

export const UploadFab = forwardRef<HTMLButtonElement, { onClick: () => void }>(
  function ({ onClick }, ref) {
    const t = useT();
    return (
      <Fab
        ref={ref}
        aria-label={t("files.upload")}
        variant="circular"
        color="primary"
        size="large"
        sx={{ position: "fixed", right: 16, bottom: 16, color: "white" }}
        onClick={onClick}
      >
        <UploadIcon fontSize="large" />
      </Fab>
    );
  }
);

function UploadDrawer({
  open,
  setOpen,
  cwd,
  onUpload,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  cwd: string;
  onUpload: () => void;
}) {
  const uploadEnqueue = useUploadEnqueue();
  const t = useT();
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderError, setFolderError] = useState(false);

  const handleUpload = useCallback(
    (action: string) => () => {
      const input = document.createElement("input");
      input.type = "file";
      switch (action) {
        case "photo":
          input.accept = "image/*";
          input.capture = "environment";
          break;
        case "image":
          input.accept = "image/*,video/*";
          break;
        case "file":
          input.accept = "*/*";
          break;
      }
      input.multiple = true;
      input.onchange = async () => {
        if (!input.files) return;
        const files = Array.from(input.files);
        uploadEnqueue(...files.map((file) => ({ file, basedir: cwd })));
        setOpen(false);
        onUpload();
      };
      input.click();
    },
    [cwd, onUpload, setOpen, uploadEnqueue]
  );

  const takePhoto = useMemo(() => handleUpload("photo"), [handleUpload]);
  const uploadImage = useMemo(() => handleUpload("image"), [handleUpload]);
  const uploadFile = useMemo(() => handleUpload("file"), [handleUpload]);

  return (
    <>
    <Drawer
      anchor="bottom"
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{ sx: { borderRadius: "16px 16px 0 0" } }}
    >
      <Card sx={{ padding: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <IconCaptionButton
              icon={<CameraIcon fontSize="large" />}
              caption={t("files.camera")}
              onClick={takePhoto}
            />
          </Grid>
          <Grid item xs={3}>
            <IconCaptionButton
              icon={<ImageIcon fontSize="large" />}
              caption={t("files.imageVideo")}
              onClick={uploadImage}
            />
          </Grid>
          <Grid item xs={3}>
            <IconCaptionButton
              icon={<UploadIcon fontSize="large" />}
              caption={t("files.upload")}
              onClick={uploadFile}
            />
          </Grid>
          <Grid item xs={3}>
            <IconCaptionButton
              icon={<CreateNewFolderIcon fontSize="large" />}
              caption={t("files.createFolder")}
              onClick={() => {
                setOpen(false);
                setFolderOpen(true);
              }}
            />
          </Grid>
        </Grid>
      </Card>
    </Drawer>
    <PromptDialog
      open={folderOpen}
      title={t("files.createFolder")}
      label={t("files.folderName")}
      onClose={() => setFolderOpen(false)}
      onSubmit={async (folderName) => {
        setFolderOpen(false);
        try {
          await createFolder(cwd, folderName);
          onUpload();
        } catch {
          setFolderError(true);
        }
      }}
    />
    <Snackbar
      open={folderError}
      autoHideDuration={4000}
      onClose={() => setFolderError(false)}
      message={t("files.invalidFolderName")}
    />
    </>
  );
}

export default UploadDrawer;
