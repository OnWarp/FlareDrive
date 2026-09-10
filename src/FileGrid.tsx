import React, { useRef } from "react";
import {
  Box,
  Grid,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MimeIcon from "./MimeIcon";
import { davPath } from "./davStorage";
import { humanReadableSize } from "./app/utils";

export interface FileItem {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata: { contentType: string };
  customMetadata?: { thumbnail?: string };
}

function extractFilename(key: string) {
  return key.split("/").pop();
}

export function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function isDirectory(file: FileItem) {
  return file.httpMetadata?.contentType === "application/x-directory";
}

function FileRow({
  file,
  multiSelected,
  onCwdChange,
  onMultiSelect,
}: {
  file: FileItem;
  multiSelected: string[] | null;
  onCwdChange: (newCwd: string) => void;
  onMultiSelect: (key: string) => void;
}) {
  const timer = useRef<number | null>(null);
  const longPress = useRef(false);

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const open = () => {
    if (isDirectory(file)) onCwdChange(file.key + "/");
    else
      window.open(
        davPath(encodeKey(file.key)),
        "_blank",
        "noopener,noreferrer"
      );
  };

  return (
    <ListItemButton
      selected={multiSelected?.includes(file.key)}
      onClick={() => {
        if (longPress.current) {
          longPress.current = false;
          return;
        }
        if (multiSelected !== null) onMultiSelect(file.key);
        else open();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onMultiSelect(file.key);
      }}
      onTouchStart={() => {
        longPress.current = false;
        timer.current = window.setTimeout(() => {
          longPress.current = true;
          onMultiSelect(file.key);
        }, 500);
      }}
      onTouchEnd={clearTimer}
      onTouchMove={clearTimer}
      onTouchCancel={clearTimer}
      sx={{ userSelect: "none", WebkitTouchCallout: "none" }}
    >
      <ListItemIcon>
        {file.customMetadata?.thumbnail ? (
          <img
            src={davPath(`_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`)}
            alt={file.key}
            style={{ width: 36, height: 36, objectFit: "cover" }}
          />
        ) : (
          <MimeIcon contentType={file.httpMetadata.contentType} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={extractFilename(file.key)}
        primaryTypographyProps={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        secondary={
          <React.Fragment>
            <Box
              sx={{
                display: "inline-block",
                minWidth: "160px",
                marginRight: 1,
              }}
            >
              {new Date(file.uploaded).toLocaleString()}
            </Box>
            {!isDirectory(file) && humanReadableSize(file.size)}
          </React.Fragment>
        }
      />
    </ListItemButton>
  );
}

function FileGrid({
  files,
  onCwdChange,
  multiSelected,
  onMultiSelect,
  emptyMessage,
}: {
  files: FileItem[];
  onCwdChange: (newCwd: string) => void;
  multiSelected: string[] | null;
  onMultiSelect: (key: string) => void;
  emptyMessage?: React.ReactNode;
}) {
  return files.length === 0 ? (
    emptyMessage
  ) : (
    <Grid container sx={{ paddingBottom: "48px" }}>
      {files.map((file) => (
        <Grid item key={file.key} xs={12} sm={6} md={4} lg={3} xl={2}>
          <FileRow
            file={file}
            multiSelected={multiSelected}
            onCwdChange={onCwdChange}
            onMultiSelect={onMultiSelect}
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default FileGrid;
