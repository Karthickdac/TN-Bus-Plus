import { useEffect, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PULSE_CSS = `@keyframes tnbus-pulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(2.2);opacity:0}100%{opacity:0}}.leaflet-container{font-family:inherit}`;

export function LiveMap({
  center,
  zoom = 8,
  className,
  children,
}: {
  center: [number, number];
  zoom?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PULSE_CSS }} />
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className={className}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {children}
      </MapContainer>
    </>
  );
}

export function busIcon(heading: number, color: string) {
  return L.divIcon({
    className: "tnbus-marker",
    html: `<div style="position:relative;width:34px;height:34px">
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:.35;animation:tnbus-pulse 2s ease-out infinite"></span>
      <span style="position:absolute;inset:6px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${color}99;border:2px solid #fff">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(${heading}deg)"><path d="M12 2 19 21 12 17 5 21 Z"/></svg>
      </span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function stopIcon(passed: boolean) {
  const color = passed ? "#94a3b8" : "#6366f1";
  return L.divIcon({
    className: "tnbus-marker",
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(15,23,42,.4)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function PanTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

export function FitBounds({ points, fitKey }: { points: [number, number][]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 9);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [48, 48], maxZoom: 9 });
    }
    // Fit only when the membership of points changes, not on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}
