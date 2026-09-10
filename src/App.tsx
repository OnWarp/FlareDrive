import { ThemeProvider } from "@emotion/react";
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  Snackbar,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import Header from "./Header";
import Login from "./Login";
import Main from "./Main";
import ProgressDialog from "./ProgressDialog";
import { TransferQueueProvider } from "./app/transferQueue";
import { I18nProvider } from "./i18n";

const globalStyles = (
  <GlobalStyles
    styles={{
      "html, body, #root": { height: "100%" },
      ".lang-full": { display: "none" },
      "@media (min-width: 600px)": {
        ".lang-short": { display: "none" },
        ".lang-full": { display: "inline" },
      },
    }}
  />
);

function Shell() {
  const [search, setSearch] = useState("");
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [auth, setAuth] = useState<"loading" | "anon" | "ok">("loading");

  const refreshAuth = useCallback(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => setAuth(res.ok ? "ok" : "anon"))
      .catch(() => setAuth("anon"));
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  if (auth === "loading") return null;
  if (auth === "anon") return <Login onLoggedIn={refreshAuth} />;

  return (
    <TransferQueueProvider>
      <Stack sx={{ height: "100%" }}>
        <Header
          search={search}
          onSearchChange={(newSearch: string) => setSearch(newSearch)}
          setShowProgressDialog={setShowProgressDialog}
          onLogout={() => {
            fetch("/api/auth/logout", {
              method: "POST",
              credentials: "include",
            }).finally(() => setAuth("anon"));
          }}
        />
        <Main search={search} onError={setError} />
      </Stack>
      <Snackbar
        autoHideDuration={5000}
        open={Boolean(error)}
        message={error?.message}
        onClose={() => setError(null)}
      />
      <ProgressDialog
        open={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
      />
    </TransferQueueProvider>
  );
}

function ThemedApp() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDark ? "dark" : "light",
          primary: { main: "#f38020" },
        },
        shape: { borderRadius: 12 },
      }),
    [prefersDark]
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <Shell />
    </ThemeProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemedApp />
    </I18nProvider>
  );
}

export default App;
