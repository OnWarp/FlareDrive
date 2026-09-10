import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  Cloud as CloudIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";
import { useT } from "./i18n";

export type Mount = {
  id: string;
  name: string;
  type: "r2" | "s3";
  builtin?: boolean;
  s3?: { endpoint: string; region: string; bucket: string; accessKeyId: string };
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  return res;
}

export default function StoragePanel() {
  const t = useT();
  const [defaultId, setDefaultId] = useState("");
  const [mounts, setMounts] = useState<Mount[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<Mount | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; mount: Mount } | null>(null);

  async function reload() {
    const res = await api("/api/storage");
    if (!res.ok) return;
    const data = await res.json();
    setDefaultId(data.defaultId);
    setMounts(data.mounts);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, display: "block" }}>
        {t("storage.default")}
      </Typography>
      {mounts
        .filter((m) => m.id === defaultId)
        .map((m) => (
          <ListItemButton key={m.id} selected>
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={m.name} secondary={m.type === "r2" ? "Cloudflare R2" : "Custom S3"} />
          </ListItemButton>
        ))}
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, display: "block" }}>
        {t("storage.spaces")}
      </Typography>
      {mounts.map((m) => (
        <ListItemButton
          key={m.id}
          onClick={() => api("/api/storage/default", { method: "PUT", body: JSON.stringify({ id: m.id }) }).then(reload)}
        >
          <ListItemIcon>
            <CloudIcon />
          </ListItemIcon>
          <ListItemText
            primary={m.name}
            secondary={m.type === "r2" ? "Cloudflare R2" : "Custom S3"}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenu({ el: e.currentTarget, mount: m });
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        </ListItemButton>
      ))}
      <Box sx={{ p: 1.5 }}>
        <Button fullWidth variant="outlined" onClick={() => setAddOpen(true)}>
          {t("storage.add")}
        </Button>
      </Box>
      <Menu
        anchorEl={menu?.el}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
      >
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
          onClick={async () => {
            if (!menu || menu.mount.builtin) return;
            await api(`/api/storage/${menu.mount.id}`, { method: "DELETE" });
            setMenu(null);
            reload();
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
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [region, setRegion] = useState("auto");
  const [bucket, setBucket] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(mount?.name || "");
    setEndpoint(mount?.s3?.endpoint || "");
    setRegion(mount?.s3?.region || "auto");
    setBucket(mount?.s3?.bucket || "");
    setAccessKeyId(mount?.s3?.accessKeyId || "");
    setSecret("");
    setTestMsg("");
  }, [open, mount]);

  const payload = {
    type: "s3",
    name,
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey: secret,
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mount ? t("storage.edit") : t("storage.add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t("storage.type")} value={t("storage.type.s3")} disabled fullWidth />
          <TextField label={t("storage.name")} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField label="Endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} fullWidth />
          <TextField label="Region" value={region} onChange={(e) => setRegion(e.target.value)} fullWidth />
          <TextField label="Bucket" value={bucket} onChange={(e) => setBucket(e.target.value)} fullWidth />
          <TextField
            label="Access Key ID"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            fullWidth
          />
          <TextField
            label="Secret Access Key"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={mount ? "••••••••" : ""}
            fullWidth
          />
          {testMsg && <Typography variant="body2">{testMsg}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={testing}
          onClick={async () => {
            setTesting(true);
            setTestMsg("");
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
            setTestMsg(data.ok ? t("storage.test.ok") : data.error || t("storage.test.fail"));
            setTesting(false);
          }}
        >
          {t("storage.test")}
        </Button>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            if (mount) {
              const body: any = { name, endpoint, region, bucket, accessKeyId };
              if (secret) body.secretAccessKey = secret;
              await api(`/api/storage/${mount.id}`, { method: "PUT", body: JSON.stringify(body) });
            } else {
              await api("/api/storage", { method: "POST", body: JSON.stringify(payload) });
            }
            setSaving(false);
            onClose();
            onSaved();
          }}
        >
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
