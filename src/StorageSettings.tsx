import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Cloud as CloudIcon,
  MoreHoriz as MoreHorizIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { ConfirmDialog } from "./dialogs";
import { useT } from "./i18n";
import { IconTip, useCompactScreen } from "./ui";

export type Mount = {
  id: string;
  name: string;
  type: "r2" | "s3";
  builtin?: boolean;
  s3?: { endpoint: string; region: string; bucket: string; accessKeyId: string };
};

async function api(path: string, init?: RequestInit) {
  return fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
}

export function driverLabel(type: Mount["type"]) {
  return type === "r2" ? "Cloudflare R2" : "Custom S3";
}

export default function StoragePanel({ onChanged }: { onChanged?: () => void }) {
  const t = useT();
  const [defaultId, setDefaultId] = useState("");
  const [mounts, setMounts] = useState<Mount[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<Mount | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; mount: Mount } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mount | null>(null);

  async function reload() {
    const res = await api("/api/storage");
    if (!res.ok) return;
    const data = await res.json();
    setDefaultId(data.defaultId);
    setMounts(data.mounts);
    onChanged?.();
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <>
      <List disablePadding>
        {mounts.map((m) => (
          <ListItemButton
            key={m.id}
            selected={m.id === defaultId}
            onClick={() =>
              api("/api/storage/default", {
                method: "PUT",
                body: JSON.stringify({ id: m.id }),
              }).then(reload)
            }
          >
            <ListItemIcon>
              <CloudIcon />
            </ListItemIcon>
            <ListItemText
              primary={m.name}
              secondary={driverLabel(m.type)}
              sx={{ minWidth: 0, mr: 1 }}
              primaryTypographyProps={{ noWrap: true }}
              secondaryTypographyProps={{ noWrap: true }}
            />
            <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {m.id === defaultId && <CheckIcon fontSize="small" color="primary" />}
            <IconTip
              title={t("nav.more")}
              onClick={(e) => {
                e.stopPropagation();
                setMenu({ el: e.currentTarget, mount: m });
              }}
            >
              <MoreHorizIcon />
            </IconTip>
            </Box>
          </ListItemButton>
        ))}
        <ListItemButton onClick={() => setAddOpen(true)}>
          <ListItemText primary={`＋ ${t("storage.add")}`} />
        </ListItemButton>
      </List>
      <Menu anchorEl={menu?.el} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          disabled={menu?.mount.builtin}
          onClick={() => {
            if (menu) setEdit(menu.mount);
            setMenu(null);
          }}
        >
          {t("storage.edit")}
        </MenuItem>
        <MenuItem
          disabled={menu?.mount.builtin}
          sx={{ color: "error.main" }}
          onClick={() => {
            if (menu) setPendingDelete(menu.mount);
            setMenu(null);
          }}
        >
          {t("storage.delete")}
        </MenuItem>
      </Menu>
      <StorageForm
        open={addOpen || Boolean(edit)}
        mount={edit}
        onClose={() => {
          setAddOpen(false);
          setEdit(null);
        }}
        onSaved={reload}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t("storage.deleteConfirm")}
        body={t("storage.deleteConfirmBody", { name: pendingDelete?.name || "" })}
        confirmLabel={t("storage.delete")}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await api(`/api/storage/${pendingDelete.id}`, { method: "DELETE" });
          setPendingDelete(null);
          reload();
        }}
      />
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        {children}
      </Stack>
    </Box>
  );
}

function StorageForm({
  open,
  mount,
  onClose,
  onSaved,
}: {
  open: boolean;
  mount: Mount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const compact = useCompactScreen();
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [region, setRegion] = useState("auto");
  const [bucket, setBucket] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [testDetail, setTestDetail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(mount?.name || "");
    setEndpoint(mount?.s3?.endpoint || "");
    setRegion(mount?.s3?.region || "auto");
    setBucket(mount?.s3?.bucket || "");
    setAccessKeyId(mount?.s3?.accessKeyId || "");
    setSecret("");
    setShowSecret(false);
    setTestOk(null);
    setTestDetail("");
  }, [open, mount]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={compact}
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: compact ? 0 : "16px",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        {mount ? t("storage.edit") : t("storage.add")}
        <Box sx={{ ml: "auto" }}>
          <IconTip title={t("common.cancel")} onClick={onClose}>
            <CloseIcon />
          </IconTip>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ flex: 1 }}>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Group title={t("storage.group.basic")}>
            <TextField label={t("storage.name")} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label={t("storage.type")} value={t("storage.type.s3")} disabled fullWidth />
          </Group>
          <Group title={t("storage.group.s3")}>
            <TextField label="Endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} fullWidth />
            <TextField label="Region" value={region} onChange={(e) => setRegion(e.target.value)} fullWidth />
            <TextField label="Bucket" value={bucket} onChange={(e) => setBucket(e.target.value)} fullWidth />
          </Group>
          <Group title={t("storage.group.creds")}>
            <TextField
              label="Access Key ID"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Secret Access Key"
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={mount ? "••••••••" : ""}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowSecret((v) => !v)}
                      aria-label={showSecret ? t("login.hidePassword") : t("login.showPassword")}
                    >
                      {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Group>
          {testOk === true && <Alert severity="success">{t("storage.test.ok")}</Alert>}
          {testOk === false && (
            <Alert severity="warning">
              {t("storage.test.fail")}
              {testDetail ? ` — ${testDetail}` : ` ${t("storage.test.failHint")}`}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: 2,
          py: 1.5,
          justifyContent: "space-between",
          borderTop: compact ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          disabled={testing}
          onClick={async () => {
            setTesting(true);
            setTestOk(null);
            const res = await api("/api/storage/test", {
              method: "POST",
              body: JSON.stringify({
                id: mount?.id,
                endpoint,
                region,
                bucket,
                accessKeyId,
                secretAccessKey: secret || undefined,
              }),
            });
            const data = await res.json();
            setTestOk(Boolean(data.ok));
            setTestDetail(data.ok ? "" : data.error || "");
            setTesting(false);
          }}
        >
          {t("storage.test")}
        </Button>
        <Box>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={saving}
            sx={{ ml: 1 }}
            onClick={async () => {
              setSaving(true);
              if (mount) {
                const body: Record<string, string> = { name, endpoint, region, bucket, accessKeyId };
                if (secret) body.secretAccessKey = secret;
                await api(`/api/storage/${mount.id}`, { method: "PUT", body: JSON.stringify(body) });
              } else {
                await api("/api/storage", {
                  method: "POST",
                  body: JSON.stringify({
                    type: "s3",
                    name,
                    endpoint,
                    region,
                    bucket,
                    accessKeyId,
                    secretAccessKey: secret,
                  }),
                });
              }
              setSaving(false);
              onClose();
              onSaved();
            }}
          >
            {t("common.save")}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
