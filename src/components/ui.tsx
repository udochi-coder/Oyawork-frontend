import { ArrowLeft, BadgeCheck, Check, Loader2, Star } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../lib/api";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Full-height phone screen with optional header, scrolling body and pinned footer. */
export function Screen({ header, footer, children, className, nav }: {
  header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string; nav?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {header}
      <main className={cx("flex-1 overflow-y-auto px-4 pb-6", className)}>{children}</main>
      {footer && <div className="border-t border-line bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      {nav}
    </div>
  );
}

export function Header({ title, back = true, right, center, onBack }: {
  title?: ReactNode; back?: boolean | string; right?: ReactNode; center?: boolean; onBack?: () => void;
}) {
  const navigate = useNavigate();
  const goBack = () => (onBack ? onBack() : typeof back === "string" ? navigate(back) : navigate(-1));
  return (
    <header className={cx("flex min-h-[56px] items-center gap-3 border-b border-line/60 bg-white px-4", center && "justify-center")}>
      {back && (
        <button aria-label="Back" onClick={goBack} className="-ml-1 grid h-9 w-9 place-items-center rounded-full hover:bg-field">
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className={cx("flex-1 truncate text-[16px] font-semibold", center && "text-center")}>{title}</h1>
      {right}
    </header>
  );
}

export function HelpPill({ to = "/conduct", label = "Help" }: { to?: string; label?: string }) {
  return <Link to={to} className="pill">{label}</Link>;
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={cx("inline-block rounded-xl bg-brand-soft font-bold text-brand-dark", size === "lg" ? "px-5 py-2.5 text-[26px]" : "px-3 py-1 text-lg")}>
      OyaWork
    </span>
  );
}

// Literal class names so Tailwind keeps them in the build.
const VARIANTS = {
  primary: "btn-primary", outline: "btn-outline", ghost: "btn-ghost", danger: "btn-danger", "danger-outline": "btn-danger-outline",
} as const;

export function Button({ children, busy, variant = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean; variant?: "primary" | "outline" | "ghost" | "danger" | "danger-outline";
}) {
  return (
    <button {...rest} disabled={busy || rest.disabled} className={cx(VARIANTS[variant], "w-full", className)}>
      {busy && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string | null; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-subtle">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] font-medium text-danger">{error}</span>}
    </label>
  );
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[13px] font-medium text-red-700">{children}</p>;
}

export function InfoNote({ icon, children, tone = "muted" }: { icon?: ReactNode; children: ReactNode; tone?: "muted" | "green" | "warn" | "error" }) {
  const tones = { muted: "bg-surface text-muted", green: "bg-brand-soft text-brand-dark", warn: "bg-warn-soft text-warn border border-amber-300", error: "bg-danger-soft text-red-700" };
  return (
    <div className={cx("flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px] leading-snug", tones[tone])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

export function VerifiedBadge({ label = "VERIFIED" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-brand-dark">
      <BadgeCheck size={12} /> {label}
    </span>
  );
}

export function Rating({ value, count, className }: { value: string | number; count?: number | string; className?: string }) {
  const v = Number(value || 0);
  return (
    <span className={cx("inline-flex items-center gap-1 text-[13px] font-semibold text-sun", className)}>
      <Star size={14} className="fill-sun text-sun" /> {v ? v.toFixed(1) : "New"}
      {count !== undefined && <span className="font-normal text-subtle">({count})</span>}
    </span>
  );
}

export function mediaUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export function Avatar({ src, name, size = 44, ring }: { src?: string | null; name: string; size?: number; ring?: boolean }) {
  const url = mediaUrl(src);
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size }} className={cx("shrink-0 rounded-full object-cover", ring && "ring-2 ring-brand ring-offset-2")} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cx("grid shrink-0 place-items-center rounded-full bg-navy font-bold text-white", ring && "ring-2 ring-brand ring-offset-2")}>
      {initials || "?"}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-2 py-16 text-subtle">
      <Loader2 className="animate-spin text-brand" size={28} />
      {label && <span className="text-[13px]">{label}</span>}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-14 text-center">
      {icon && <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand-dark">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="text-[13px] text-subtle">{children}</div>}
    </div>
  );
}

export function ChoiceCard({ selected, onClick, title, body, icon, radio = true }: {
  selected: boolean; onClick: () => void; title: ReactNode; body?: ReactNode; icon?: ReactNode; radio?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cx("flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition",
        selected ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-white")}>
      {icon}
      <div className="flex-1">
        <div className={cx("text-[15px] font-semibold", selected ? "text-brand-dark" : "text-ink")}>{title}</div>
        {body && <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{body}</div>}
      </div>
      {radio && (
        selected ? <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white"><Check size={13} strokeWidth={3} /></span>
          : <span className="h-5 w-5 rounded-full border-2 border-line" />
      )}
    </button>
  );
}

export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-muted">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
        checked ? "border-brand bg-brand text-white" : "border-line bg-white")}>
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx("relative h-6 w-11 rounded-full transition", on ? "bg-brand" : "bg-gray-300")}>
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[11.5px] text-subtle">{label}</div>
      <div className={cx("mt-1 text-[17px] font-bold", accent ? "text-brand-dark" : "text-ink")}>{value}</div>
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("mt-6", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Steps({ current, total }: { current: number; total: number }) {
  return <span className="pill">Step {current} of {total}</span>;
}
