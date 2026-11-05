import { useEffect, useState } from "react";

export type Coords = { latitude: number; longitude: number; accuracy?: number };

// Lekki Phase 1: used when the browser won't share a location.
export const LAGOS_DEFAULT: Coords = { latitude: 6.4474, longitude: 3.472 };

export function currentPosition(timeout = 10000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Location is not available on this device."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: round(p.coords.latitude), longitude: round(p.coords.longitude), accuracy: p.coords.accuracy }),
      (err) => reject(new Error(err.code === 1 ? "Location permission was denied." : "We couldn't get your location.")),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}

export const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Watch the device position while `active` is true. */
export function useWatchPosition(active: boolean) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!active || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setCoords({ latitude: round(p.coords.latitude), longitude: round(p.coords.longitude), accuracy: p.coords.accuracy });
      },
      (err) => setError(err.code === 1 ? "Location permission was denied." : "Waiting for GPS signal..."),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
  return { coords, error };
}
