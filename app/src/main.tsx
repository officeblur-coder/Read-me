import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
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

// Short campaign links: lyrago.ro/fb, /qr, /ig, /google… open the menu and tag the order's source.
const SOURCES = ["fb", "ig", "qr", "google", "tiktok", "wa", "flyer"];
function SourceMenu() {
  const { src } = useParams();
  return <Menu source={src && SOURCES.includes(src) ? src : undefined} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/comanda/:token" element={<Track />} />
        <Route path="/receptie" element={<Reception />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/curier" element={<Courier />} />
        <Route path="/cont" element={<Account />} />
        <Route path="/confidentialitate" element={<Privacy />} />
        <Route path="/termeni" element={<Terms />} />
        <Route path="/:src" element={<SourceMenu />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
