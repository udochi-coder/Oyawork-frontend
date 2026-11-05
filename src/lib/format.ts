export function naira(value: string | number | null | undefined, opts: { decimals?: boolean } = {}) {
  const n = Number(value ?? 0);
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: opts.decimals ? 2 : 0, maximumFractionDigits: opts.decimals ? 2 : 0 });
}

export function km(d: number | null | undefined) {
  if (d === null || d === undefined) return "Distance unknown";
  return d < 1 ? `${Math.round(d * 1000)} m away` : `${d.toFixed(1)} km away`;
}

export function when(date: string, time?: string) {
  const d = new Date(`${date}T${time || "00:00"}`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = same(d, today) ? "Today" : same(d, tomorrow) ? "Tomorrow" : d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
  if (!time) return day;
  return `${day}, ${d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}`;
}

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hour${s < 7200 ? "" : "s"} ago`;
  if (s < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

export const firstName = (name: string) => (name || "").trim().split(/\s+/)[0] || "there";
