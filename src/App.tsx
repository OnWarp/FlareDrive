import { CssBaseline, GlobalStyles, Snackbar, Stack } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import Header from "./Header";
import Login from "./Login";
import Main from "./Main";
import ProgressDialog from "./ProgressDialog";
import Settings from "./Settings";
import { TransferQueueProvider } from "./app/transferQueue";
import { AppearanceProvider } from "./appearance";
import { I18nProvider } from "./i18n";

const globalStyles = (
  <GlobalStyles styles={{ "html, body, #root": { height: "100%" } }} />
);

function Shell() {
  const [search, setSearch] = useState("");
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
          onSettings={() => setShowSettings(true)}
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
      <Settings open={showSettings} onClose={() => setShowSettings(false)} />
    </TransferQueueProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppearanceProvider>
        <CssBaseline />
        {globalStyles}
        <Shell />
      </AppearanceProvider>
    </I18nProvider>
  );
}

export default App;
