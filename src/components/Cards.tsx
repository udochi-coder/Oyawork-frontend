import { CalendarDays, ChevronRight, MapPin, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { km, naira, when } from "../lib/format";
import type { Booking, Job, PublicWorker } from "../lib/types";
import { Avatar, Rating, VerifiedBadge, cx } from "./ui";

export function JobMeta({ location, distance, date, time }: { location: string; distance?: number | null; date: string; time: string }) {
  return (
    <div className="space-y-1.5 text-[13px] text-muted">
      <div className="flex items-center gap-2 font-semibold text-ink"><MapPin size={15} /> {location || "Location shared after booking"}</div>
      {distance !== undefined && <div className="flex items-center gap-2"><Navigation size={14} /> {km(distance)}{distance != null && " from your location"}</div>}
      <div className="flex items-center gap-2"><CalendarDays size={14} /> {when(date, time)}</div>
    </div>
  );
}

export function WorkerRow({ worker, to, right }: { worker: PublicWorker; to?: string; right?: React.ReactNode }) {
  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
      <Avatar src={worker.profile_photo} name={worker.full_name} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{worker.full_name}</span>
          {worker.is_verified && <VerifiedBadge />}
        </div>
        <div className="truncate text-[12.5px] text-muted">{worker.skills.slice(0, 2).join(" & ") || "General work"} • {worker.location?.split(",")[0] || "Lagos"}</div>
        <div className="mt-0.5 flex items-center gap-2"><Rating value={worker.rating} count={`${worker.review_count} reviews`} />
          {worker.distance_km != null && <span className="text-[12px] text-subtle">• {km(worker.distance_km)}</span>}</div>
      </div>
      {right}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-warn-soft text-warn",
  scheduled: "bg-brand-soft text-brand-dark",
  en_route: "bg-brand text-white",
  arrived: "bg-brand text-white",
  in_progress: "bg-brand text-white",
  completed: "bg-warn-soft text-warn",
  confirmed: "bg-field text-muted",
  cancelled: "bg-field text-subtle",
  disputed: "bg-danger-soft text-red-700",
};

export function BookingRow({ booking }: { booking: Booking }) {
  const other = booking.my_party === "worker" ? booking.employer.full_name : booking.worker.full_name;
  return (
    <Link to={`/bookings/${booking.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="tag">{booking.job.category}</span>
          <span className={cx("rounded-md px-2 py-0.5 text-[11px] font-bold", STATUS_TONE[booking.status])}>{booking.status_label}</span>
        </div>
        <div className="mt-1.5 truncate font-semibold">{booking.job.title}</div>
        <div className="text-[12.5px] text-muted">{other} • {when(booking.scheduled_date, booking.scheduled_time)}</div>
      </div>
      <div className="text-right">
        <div className="font-bold text-brand-dark">{naira(booking.agreed_price)}</div>
        <ChevronRight size={18} className="ml-auto mt-1 text-subtle" />
      </div>
    </Link>
  );
}

export function JobCard({ job, children, to }: { job: Job; children?: React.ReactNode; to?: string }) {
  const head = (
    <>
      <div className="flex items-start justify-between">
        <span className="tag">{job.category}</span>
        <span className="text-[17px] font-bold text-brand-dark">{naira(job.offered_price)}</span>
      </div>
      <div className="mt-2 font-semibold">{job.title}</div>
      <div className="mt-2"><JobMeta location={job.location} distance={job.distance_km} date={job.scheduled_date} time={job.scheduled_time} /></div>
    </>
  );
  return (
    <div className="rounded-2xl border-2 border-brand bg-white p-4">
      {to ? <Link to={to} className="block">{head}</Link> : head}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
