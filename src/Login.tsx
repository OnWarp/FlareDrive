import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { LanguageMenu, useT } from "./i18n";

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const t = useT();
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      onLoggedIn();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        position: "relative",
        background:
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at top, #2a2118, #121212 55%)"
            : "radial-gradient(circle at top, #ffe8d2, #f6f6f6 55%)",
      }}
    >
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <LanguageMenu variant="text" />
      </Box>
      <Stack
        component="form"
        onSubmit={submit}
        spacing={2}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: theme.shadows[8],
        }}
      >
        <Typography variant="h5" fontWeight={700} textAlign="center">
          {t("app.name")}
        </Typography>
        <Typography color="text.secondary" textAlign="center">
          {t("app.tagline")}
        </Typography>
        {error && <Alert severity="error">{t("login.failed")}</Alert>}
        <TextField
          autoComplete="username"
          label={t("login.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          autoFocus
        />
        <TextField
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          label={t("login.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showPassword ? t("login.hidePassword") : t("login.showPassword")
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !username || !password}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : t("login.submit")}
        </Button>
      </Stack>
    </Box>
  );
}
