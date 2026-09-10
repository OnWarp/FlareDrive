// Main.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
} from "@mui/material";
import { Check as CheckIcon, Home as HomeIcon, NoteAdd as NoteAddIcon } from "@mui/icons-material";

import FileGrid, { encodeKey, FileItem, isDirectory } from "./FileGrid";
import MultiSelectToolbar from "./MultiSelectToolbar";
import UploadDrawer, { UploadFab } from "./UploadDrawer";
import TextPadDrawer from "./TextPadDrawer";
import { copyPaste, fetchPath } from "./app/transfer";
import { useTransferQueue, useUploadEnqueue } from "./app/transferQueue";
import { ConfirmDialog, PromptDialog } from "./dialogs";
import { useT } from "./i18n";
import { davPath, getCurrentStorageId, setCurrentStorageId, withDav } from "./davStorage";
import type { Mount } from "./StorageSettings";

// Centered helper
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      {children}
    </Box>
  );
}

// Breadcrumb component
function PathBreadcrumb({
  path,
  onCwdChange,
  storageName,
  mounts,
  currentId,
  onPickStorage,
}: {
  path: string;
  onCwdChange: (newCwd: string) => void;
  storageName: string;
  mounts: Mount[];
  currentId: string;
  onPickStorage: (id: string) => void;
}) {
  const parts = path.replace(/\/$/, "").split("/").filter(Boolean);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  return (
    <Breadcrumbs separator="›" sx={{ padding: 1 }}>
      <Button
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ minWidth: 0, textTransform: "none" }}
      >
        {storageName || "R2"} ▾
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {mounts.map((m) => (
          <MenuItem
            key={m.id}
            selected={m.id === currentId}
            onClick={() => {
              setAnchor(null);
              onPickStorage(m.id);
            }}
          >
            <ListItemIcon>
              <CheckIcon
                fontSize="small"
                sx={{ visibility: m.id === currentId ? "visible" : "hidden" }}
              />
            </ListItemIcon>
            {m.name}
          </MenuItem>
        ))}
      </Menu>
      {parts.length > 0 && (
        <Button onClick={() => onCwdChange("")} sx={{ minWidth: 0, padding: 0 }}>
          <HomeIcon fontSize="small" />
        </Button>
      )}
      {parts.map((part, index) =>
        index === parts.length - 1 ? (
          <Typography key={index} color="text.primary">
            {part}
          </Typography>
        ) : (
          <Link
            key={index}
            component="button"
            onClick={() => {
              onCwdChange(parts.slice(0, index + 1).join("/") + "/");
            }}
          >
            {part}
          </Link>
        )
      )}
    </Breadcrumbs>
  );
}

// DropZone wrapper
function DropZone({
  children,
  onDrop,
}: {
  children: React.ReactNode;
  onDrop: (files: FileList) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowY: "auto",
        backgroundColor: (theme) => theme.palette.background.default,
        filter: dragging ? "brightness(0.9)" : "none",
        transition: "filter 0.2s",
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.files);
        setDragging(false);
      }}
    >
      {children}
    </Box>
  );
}

// Main Component
function Main({
  search,
  onError,
}: {
  search: string;
  onError: (error: Error) => void;
}) {
  const t = useT();
  const [cwd, setCwd] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [multiSelected, setMultiSelected] = useState<string[] | null>(null);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [showTextPadDrawer, setShowTextPadDrawer] = useState(false);
  const [lastUploadKey, setLastUploadKey] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mounts, setMounts] = useState<Mount[]>([]);
  const [currentId, setCurrentId] = useState("");

  const transferQueue = useTransferQueue();
  const uploadEnqueue = useUploadEnqueue();

  const fetchFiles = useCallback(() => {
    fetchPath(cwd)
      .then((files) => {
        setFiles(files);
        setMultiSelected(null);
      })
      .catch(onError)
      .finally(() => setLoading(false));
  }, [cwd, onError, currentId]);

  useEffect(() => {
    fetch("/api/storage", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMounts(data.mounts || []);
        const def = data.defaultId || "";
        setCurrentId((cur) => cur || def);
        if (!getCurrentStorageId() && def) setCurrentStorageId(def);
      })
      .catch(() => {});
  }, []);

  useEffect(() => setLoading(true), [cwd]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (!transferQueue.length) return;
    const lastFile = transferQueue[transferQueue.length - 1];
    if (["pending", "in-progress"].includes(lastFile.status)) {
      setLastUploadKey(lastFile.remoteKey);
    } else if (lastUploadKey) {
      fetchFiles();
      setLastUploadKey(null);
    }
  }, [cwd, fetchFiles, lastUploadKey, transferQueue]);

  const filteredFiles = useMemo(
    () =>
      (search
        ? files.filter((file) =>
            file.key.toLowerCase().includes(search.toLowerCase())
          )
        : files
      ).sort((a, b) => (isDirectory(a) ? -1 : isDirectory(b) ? 1 : 0)),
    [files, search]
  );

  const handleMultiSelect = useCallback((key: string) => {
    setMultiSelected((prev) => {
      if (prev === null) return [key];
      if (prev.includes(key)) {
        const updated = prev.filter((k) => k !== key);
        return updated.length ? updated : null;
      }
      return [...prev, key];
    });
  }, []);

  return (
    <>
      <PathBreadcrumb
        path={cwd}
        onCwdChange={setCwd}
        storageName={mounts.find((m) => m.id === currentId)?.name || ""}
        mounts={mounts}
        currentId={currentId}
        onPickStorage={(id) => {
          setCurrentStorageId(id);
          setCurrentId(id);
          setCwd("");
          setLoading(true);
        }}
      />

      {loading ? (
        <Centered>
          <CircularProgress />
        </Centered>
      ) : (
        <DropZone
          onDrop={(files) => {
            uploadEnqueue(
              ...Array.from(files).map((file) => ({ file, basedir: cwd }))
            );
          }}
        >
          <FileGrid
            files={filteredFiles}
            onCwdChange={(newCwd: string) => setCwd(newCwd)}
            multiSelected={multiSelected}
            onMultiSelect={handleMultiSelect}
            emptyMessage={<Centered>{t("files.empty")}</Centered>}
          />
        </DropZone>
      )}

      {multiSelected === null && (
        <>
          <UploadFab onClick={() => setShowUploadDrawer(true)} />
          <Button
            variant="contained"
            startIcon={<NoteAddIcon />}
            sx={{
              position: "fixed",
              bottom: 90,
              right: 24,
              zIndex: 999,
            }}
            onClick={() => setShowTextPadDrawer(true)}
          >
            {t("files.textPad")}
          </Button>
        </>
      )}

      <UploadDrawer
        open={showUploadDrawer}
        setOpen={setShowUploadDrawer}
        cwd={cwd}
        onUpload={fetchFiles}
      />

      <TextPadDrawer
        open={showTextPadDrawer}
        setOpen={setShowTextPadDrawer}
        cwd={cwd}
        onUpload={fetchFiles}
      />

      <MultiSelectToolbar
        multiSelected={multiSelected}
        onClose={() => setMultiSelected(null)}
        onDownload={() => {
          if (multiSelected?.length !== 1) return;
          const a = document.createElement("a");
          a.href = davPath(encodeKey(multiSelected[0]));
          a.download = multiSelected[0].split("/").pop()!;
          a.click();
        }}
        onRename={() => {
          if (multiSelected?.length !== 1) return;
          setRenameOpen(true);
        }}
        onDelete={() => {
          if (!multiSelected?.length) return;
          setDeleteOpen(true);
        }}
        onShare={() => {
          if (multiSelected?.length !== 1) return;
          const url = new URL(
            davPath(encodeKey(multiSelected[0])),
            window.location.href
          );
          navigator.share({ url: url.toString() });
        }}
      />
      <PromptDialog
        open={renameOpen}
        title={t("files.rename")}
        label={t("files.renameTo")}
        initial={
          multiSelected?.[0]?.replace(/\/$/, "").split("/").pop() ?? ""
        }
        onClose={() => setRenameOpen(false)}
        onSubmit={async (newName) => {
          if (multiSelected?.length !== 1) return;
          setRenameOpen(false);
          await copyPaste(multiSelected[0], cwd + newName, true);
          fetchFiles();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t("files.delete")}
        body={`${t("files.deleteConfirm")}\n${
          multiSelected
            ?.map((key) => key.replace(/\/$/, "").split("/").pop())
            .join("\n") ?? ""
        }`}
        confirmLabel={t("files.delete")}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!multiSelected?.length) return;
          setDeleteOpen(false);
          for (const key of multiSelected)
            await fetch(davPath(encodeKey(key)), withDav({ method: "DELETE" }));
          fetchFiles();
        }}
      />
    </>
  );
}

export default Main;
