// Harta din recepție: unde sunt livratorii (GPS din aplicația lor) și unde merg comenzile lor.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_ATTR, TILE_URL, homeIcon } from "./MapPicker";
import { RESTAURANT } from "../lib/zones";
import type { Order } from "../lib/types";

import { ago, courierColor, type CourierInfo, type CourierLoc } from "../lib/couriers";

export default function CourierMap({ couriers, locs, orders, height = 520 }: { couriers: CourierInfo[]; locs: CourierLoc[]; orders: Order[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true }).setView([RESTAURANT.lat, RESTAURANT.lng], 12);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(m);
    L.marker([RESTAURANT.lat, RESTAURANT.lng], { icon: homeIcon() }).addTo(m).bindTooltip("Restaurant Lyra");
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [[RESTAURANT.lat, RESTAURANT.lng]];
    couriers.forEach((c, i) => {
      const col = courierColor(i);
      orders.filter(o => o.courier_id === c.id && o.lat != null && o.lng != null).forEach(o => {
        L.marker([o.lat!, o.lng!], { icon: L.divIcon({ className: "cm-dest", html: `<span style="border-color:${col}">#${o.number}</span>`, iconSize: [46, 26], iconAnchor: [23, 13] }) })
          .bindTooltip(`#${o.number} · ${o.address}`).addTo(g);
        pts.push([o.lat!, o.lng!]);
      });
      const l = locs.find(x => x.courier_id === c.id); if (!l) return;
      const stale = Date.now() - new Date(l.updated_at).getTime() > 3 * 60000;
      if (l.accuracy && l.accuracy < 500) L.circle([l.lat, l.lng], { radius: l.accuracy, color: col, weight: 1, fillOpacity: 0.08 }).addTo(g);
      L.marker([l.lat, l.lng], { icon: L.divIcon({ className: `cm-courier ${stale ? "stale" : ""}`, html: `<span style="background:${col}">${c.name.slice(0, 1).toUpperCase()}</span><em>${c.name}</em>`, iconSize: [40, 40], iconAnchor: [20, 20] }), zIndexOffset: 1000 })
        .bindTooltip(`${c.name} · ${ago(l.updated_at)}${l.battery != null ? ` · baterie ${Math.round(l.battery * 100)}%` : ""}`).addTo(g);
      pts.push([l.lat, l.lng]);
    });
    if (!fitted.current && pts.length > 1) { m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 }); fitted.current = true; }
  }, [couriers, locs, orders]);
  return <div ref={box} className="cm-map" style={{ height }} />;
}
