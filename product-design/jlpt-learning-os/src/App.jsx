import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { pageRegistry } from "./pages";

const defaultRoute = "today";

function readRoute() {
  const route = window.location.hash.replace(/^#\/?/, "");
  return pageRegistry[route] ? route : defaultRoute;
}

export function App() {
  const [route, setRoute] = useState(readRoute);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const Page = useMemo(() => pageRegistry[route] ?? pageRegistry[defaultRoute], [route]);

  return (
    <AppShell route={route} notify={setToast} focusMode={route === "review"}>
      <Page notify={setToast} navigate={(next) => { window.location.hash = `/${next}`; }} />
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </AppShell>
  );
}
