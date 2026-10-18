import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route, useParams } from "react-router-dom";
import "./styles.css";

// light theme by default; the visitor can switch to dark (remembered on this device)
try { document.documentElement.dataset.theme = localStorage.getItem("lyra-theme") === "dark" ? "dark" : "light"; } catch { document.documentElement.dataset.theme = "light"; }
import Menu from "./pages/Menu";
import Track from "./pages/Track";
import Reception from "./pages/Reception";
import Admin from "./pages/Admin";
import Courier from "./pages/Courier";
import Account from "./pages/Account";
import { Privacy, Terms } from "./pages/Legal";
import DemoBar from "./demo/DemoBar";

// The showcase build (mode demo) runs from a plain folder: hash URLs, and the staff screens only when asked for screenshots.
const DEMO = !!import.meta.env.VITE_DEMO;
const STAFF = !DEMO || !!import.meta.env.VITE_DEMO_STAFF;
const Router = DEMO ? HashRouter : BrowserRouter;

// Short campaign links: lyrago.ro/fb, /qr, /ig, /google… open the menu and tag the order's source.
const SOURCES = ["fb", "ig", "qr", "google", "tiktok", "wa", "flyer"];
function SourceMenu() {
  const { src } = useParams();
  return <Menu source={src && SOURCES.includes(src) ? src : undefined} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      {DEMO && <DemoBar />}
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/comanda/:token" element={<Track />} />
        {STAFF && <Route path="/receptie" element={<Reception />} />}
        {STAFF && <Route path="/admin" element={<Admin />} />}
        {STAFF && <Route path="/curier" element={<Courier />} />}
        <Route path="/cont" element={<Account />} />
        <Route path="/confidentialitate" element={<Privacy />} />
        <Route path="/termeni" element={<Terms />} />
        <Route path="/:src" element={<SourceMenu />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
