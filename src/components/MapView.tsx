import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { LAGOS_DEFAULT } from "../lib/geo";

type Point = { lat: number; lng: number } | null;

const pin = (bg: string, svg: string) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;border-radius:999px;background:${bg};display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.25);border:3px solid #fff">${svg}</div>`,
  });

const carSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2l.64-2.54a6 6 0 0 0 0-2.92l-.82-3.28A2 2 0 0 0 18.88 7H5.12a2 2 0 0 0-1.94 1.26l-.82 3.28a6 6 0 0 0 0 2.92L3 17h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
const homeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

const workerIcon = pin("#22C55E", carSvg);
const destIcon = pin("#EF4444", homeSvg);

function Fit({ a, b }: { a: Point; b: Point }) {
  const map = useMap();
  useEffect(() => {
    const pts = [a, b].filter(Boolean) as { lat: number; lng: number }[];
    if (pts.length === 2) map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 16 });
    else if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 15);
  }, [a?.lat, a?.lng, b?.lat, b?.lng, map]);
  return null;
}

export function toPoint(lat?: string | number | null, lng?: string | number | null): Point {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === "" || lng === "") return null;
  return { lat: Number(lat), lng: Number(lng) };
}

export default function MapView({ worker, destination, height = 300 }: { worker: Point; destination: Point; height?: number }) {
  const center = worker || destination || { lat: LAGOS_DEFAULT.latitude, lng: LAGOS_DEFAULT.longitude };
  return (
    <div style={{ height }} className="relative overflow-hidden">
      <MapContainer center={[center.lat, center.lng]} zoom={14} zoomControl={false} attributionControl className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {worker && <Marker position={[worker.lat, worker.lng]} icon={workerIcon} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon} />}
        {worker && destination && (
          <Polyline positions={[[worker.lat, worker.lng], [destination.lat, destination.lng]]} pathOptions={{ color: "#22C55E", weight: 4, dashArray: "8 8" }} />
        )}
        <Fit a={worker} b={destination} />
      </MapContainer>
    </div>
  );
}
