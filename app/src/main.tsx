import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route, useParams } from "react-router-dom";
import "./styles.css";

// dark "Lyra Night" theme by default; the visitor can switch to light (remembered on this device)
try { document.documentElement.dataset.theme = localStorage.getItem("lyra-theme") === "light" ? "light" : "dark"; } catch { document.documentElement.dataset.theme = "dark"; }
import Menu from "./pages/Menu";
import DemoBar from "./demo/DemoBar";
// Only the menu is in the first download; every other screen loads when it is opened.
const Track = lazy(() => import("./pages/Track"));
const Account = lazy(() => import("./pages/Account"));
const Privacy = lazy(() => import("./pages/Legal").then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Legal").then(m => ({ default: m.Terms })));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NewsletterLink = lazy(() => import("./pages/Link"));
const Reception = lazy(() => import("./pages/Reception"));
const Admin = lazy(() => import("./pages/Admin"));
const Courier = lazy(() => import("./pages/Courier"));

// A tab left open across a new release asks for screen files that no longer exist: reload once to get the new version.
window.addEventListener("vite:preloadError", e => {
  e.preventDefault();
  try {
    if (sessionStorage.getItem("lyra-reloaded") === location.pathname) return;
    sessionStorage.setItem("lyra-reloaded", location.pathname);
  } catch { /* no storage: reload anyway */ }
  location.reload();
});

// The showcase build (mode demo) runs from a plain folder: hash URLs, and the staff screens only when asked for screenshots.
const DEMO = !!import.meta.env.VITE_DEMO;
const STAFF = !DEMO || !!import.meta.env.VITE_DEMO_STAFF;
const Router = DEMO ? HashRouter : BrowserRouter;

// Short campaign links: lyrasdelivery.ro/fb, /qr, /ig, /google… open the menu and tag the order's source.
const SOURCES = ["fb", "ig", "qr", "google", "tiktok", "wa", "flyer"];
function SourceMenu() {
  const { src } = useParams();
  return <Menu source={src && SOURCES.includes(src) ? src : undefined} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      {DEMO && <DemoBar />}
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/comanda/:token" element={<Track />} />
        {STAFF && <Route path="/receptie" element={<Reception />} />}
        {STAFF && <Route path="/admin" element={<Admin />} />}
        {STAFF && <Route path="/curier" element={<Courier />} />}
        <Route path="/cont" element={<Account />} />
        <Route path="/confidentialitate" element={<Privacy />} />
        <Route path="/termeni" element={<Terms />} />
        <Route path="/dezabonare" element={<Unsubscribe />} />
        <Route path="/l" element={<NewsletterLink />} />
        <Route path="/:src" element={<SourceMenu />} />
      </Routes>
      </Suspense>
    </Router>
  </React.StrictMode>
);
