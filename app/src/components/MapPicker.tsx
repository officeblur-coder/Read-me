import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MURES_CENTER, RESTAURANT, type LatLng, type Zone } from "../lib/zones";

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
export const pinIcon = (cls = "") => L.divIcon({ className: `map-pin ${cls}`, html: "<span></span>", iconSize: [30, 40], iconAnchor: [15, 38] });
export const homeIcon = () => L.divIcon({ className: "map-home", html: "<span>L</span>", iconSize: [30, 30], iconAnchor: [15, 15] });

/** Customer map: delivery zones in the background, a draggable pin for the address. */
export default function MapPicker({ value, onChange, zones, height = 260 }: { value: LatLng | null; onChange: (p: LatLng) => void; zones: Zone[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const cb = useRef(onChange); cb.current = onChange;

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      .setView([value?.lat ?? MURES_CENTER.lat, value?.lng ?? MURES_CENTER.lng], value ? 15 : 11);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(m);
    m.attributionControl.setPrefix(false);
    L.marker([RESTAURANT.lat, RESTAURANT.lng], { icon: homeIcon(), interactive: false }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", e => cb.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);
    return () => { m.remove(); map.current = null; pin.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    zones.forEach(z => L.polygon(z.polygon, { color: z.color, weight: 2, fillOpacity: 0.12, interactive: false }).addTo(g));
    if (!value && zones.length && map.current) map.current.fitBounds(L.featureGroup(g.getLayers() as L.Layer[]).getBounds(), { padding: [12, 12] });
  }, [zones]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    if (!value) { pin.current?.remove(); pin.current = null; return; }
    if (!pin.current) {
      pin.current = L.marker([value.lat, value.lng], { icon: pinIcon(), draggable: true }).addTo(m);
      pin.current.on("dragend", () => { const p = pin.current!.getLatLng(); cb.current({ lat: p.lat, lng: p.lng }); });
    } else pin.current.setLatLng([value.lat, value.lng]);
    if (!m.getBounds().pad(-0.15).contains([value.lat, value.lng]) || m.getZoom() < 14) m.setView([value.lat, value.lng], Math.max(m.getZoom(), 15));
  }, [value?.lat, value?.lng]);

  return <div ref={box} className="map-box" style={{ height }} />;
}
