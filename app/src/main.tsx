import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import "./styles.css";
import Menu from "./pages/Menu";
import Track from "./pages/Track";
import Reception from "./pages/Reception";

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
        <Route path="/:src" element={<SourceMenu />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
