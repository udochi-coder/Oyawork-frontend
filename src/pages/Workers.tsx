import { Heart, MapPin, MessageCircle, Plus, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { Avatar, Button, Empty, ErrorNote, Header, Rating, Screen, Section, Spinner, Stat, VerifiedBadge, cx, mediaUrl } from "../components/ui";
import { post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago, km, naira } from "../lib/format";
import { useAction, useApi } from "../lib/hooks";
import type { Category, HiringRequest, Job, PublicEmployer, PublicWorker, Review } from "../lib/types";

const SKIP_KEY = "oyawork.skipped";
const readSkipped = (): number[] => {
  try {
    return JSON.parse(sessionStorage.getItem(SKIP_KEY) || "[]");
  } catch {
    return [];
  }
};

/** Bottom sheet: pick which open job to send to this worker. */
function HireSheet({ worker, onClose }: { worker: PublicWorker; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: jobs, loading } = useApi<Job[]>("/jobs/?status=open");
  const hire = useAction(async (jobId: number) => {
    const hr = await post<HiringRequest>("/hiring-requests/", { job: jobId, worker: worker.id });
    navigate(`/requests/${hr.id}`);
  });
  return (
    <div className="absolute inset-0 z-[1000] flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h3 className="text-[17px] font-bold">Hire {worker.full_name.split(" ")[0]} for...</h3>
        <p className="sub mt-1">They'll get your job request and can accept your budget or counter.</p>
        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? <Spinner /> : (jobs || []).map((j) => (
            <button key={j.id} disabled={hire.busy} onClick={() => hire.run(j.id)}
              className="flex w-full items-center justify-between rounded-xl border border-line p-3.5 text-left hover:border-brand">
              <div><div className="font-semibold">{j.title}</div><div className="text-[12px] text-subtle">{j.location}</div></div>
              <span className="font-bold text-brand-dark">{naira(j.offered_price)}</span>
            </button>
          ))}
          <Link to={`/jobs/new?worker=${worker.id}`} className="flex items-center gap-2 rounded-xl border border-dashed border-brand p-3.5 font-semibold text-brand-dark">
            <Plus size={16} /> Post a new job
          </Link>
        </div>
        <ErrorNote>{hire.error}</ErrorNote>
      </div>
    </div>
  );
}

export function FindWorkers() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qs = new URLSearchParams();
  if (params.get("category")) qs.set("category", params.get("category")!);
  if (params.get("q")) qs.set("q", params.get("q")!);
  const { data, loading } = useApi<PublicWorker[]>(`/workers/?${qs}`);
  const cats = useApi<Category[]>("/categories/");
  const [skipped, setSkipped] = useState<number[]>(readSkipped);
  const [hiring, setHiring] = useState<PublicWorker | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const start = useRef(0);
  const deck = useMemo(() => (data || []).filter((w) => !skipped.includes(w.id)), [data, skipped]);
  const top = deck[0];

  const skip = (w: PublicWorker) => {
    const next = [...skipped, w.id];
    setSkipped(next);
    try { sessionStorage.setItem(SKIP_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const message = async (w: PublicWorker) => {
    const convo = await post<{ id: number }>("/conversations/", { user_id: w.user_id });
    navigate(`/messages/${convo.id}`);
  };
  const end = () => {
    if (top && drag.x > 100) setHiring(top);
    else if (top && drag.x < -100) skip(top);
    setDrag({ x: 0, active: false });
  };

  return (
    <Screen header={<Header title="Find Nearby Workers" right={<button onClick={() => setShowFilter((v) => !v)} className="pill inline-flex items-center gap-1"><SlidersHorizontal size={13} /> Filter</button>} />}
      nav={<BottomNav />} className="relative">
      {showFilter && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={!params.get("category") ? "chip-on" : "chip"} onClick={() => setParams({})}>All</button>
          {(cats.data || []).map((c) => (
            <button key={c.id} className={params.get("category") === c.name ? "chip-on" : "chip"} onClick={() => setParams({ category: c.name })}>{c.name}</button>
          ))}
        </div>
      )}
      {(params.get("q") || params.get("category")) && <p className="mt-3 text-[13px] text-muted">Showing: <b>{params.get("q") || params.get("category")}</b></p>}
      {loading ? <Spinner label="Finding verified workers near you" /> : !top ? (
        <Empty title={data?.length ? "You've seen everyone nearby" : "No verified workers match yet"}>
          {data?.length ? <button className="font-semibold text-brand-dark" onClick={() => { setSkipped([]); try { sessionStorage.removeItem(SKIP_KEY); } catch { /* */ } }}>Start over</button>
            : <Link to="/jobs/new" className="font-semibold text-brand-dark">Post a job and we'll notify workers →</Link>}
        </Empty>
      ) : (
        <>
          <div className="relative mt-4 h-[440px] select-none">
            {deck.slice(1, 2).map((w) => (
              <div key={w.id} className="absolute inset-0 scale-[.96] rounded-3xl bg-gray-200" />
            ))}
            <div
              onPointerDown={(e) => { start.current = e.clientX; setDrag({ x: 0, active: true }); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
              onPointerMove={(e) => drag.active && setDrag({ x: e.clientX - start.current, active: true })}
              onPointerUp={end} onPointerCancel={end}
              style={{ transform: `translateX(${drag.x}px) rotate(${drag.x / 20}deg)`, transition: drag.active ? "none" : "transform .25s" }}
              className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-3xl bg-ink text-white shadow-card">
              {mediaUrl(top.profile_photo) ? <img src={mediaUrl(top.profile_photo)!} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                : <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-navy to-ink"><Avatar name={top.full_name} size={120} /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <span className={cx("absolute left-5 top-5 rounded-lg border-2 border-danger px-3 py-1 text-[15px] font-bold text-danger transition", drag.x < -30 ? "opacity-100" : "opacity-0")}>SKIP</span>
              <span className={cx("absolute right-5 top-5 rounded-lg border-2 border-brand px-3 py-1 text-[15px] font-bold text-brand transition", drag.x > 30 ? "opacity-100" : "opacity-0")}>HIRE</span>
              <Link to={`/workers/${top.id}`} className="absolute inset-x-0 bottom-0 p-5" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-[22px] font-bold">{top.full_name} {top.is_verified && <VerifiedBadge />}</div>
                <div className="text-[14px] font-semibold text-brand">{top.skills[0] ? `Professional ${top.skills[0]}` : "Verified worker"}</div>
                {top.daily_rate && <div className="mt-2 text-[22px] font-bold">{naira(top.daily_rate)} <span className="text-[12px] font-normal text-gray-300">per day</span></div>}
                <div className="mt-2 flex items-center gap-3 text-[12.5px] text-gray-200">
                  <Rating value={top.rating} /> <span>|</span> <span>{top.completed_jobs} Jobs Completed</span> <span>|</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={12} />{km(top.distance_km)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">{top.skills.slice(0, 4).map((s) => <span key={s} className="rounded-md bg-white/20 px-2 py-1 text-[11px] font-semibold">{s}</span>)}</div>
              </Link>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-6">
            <button aria-label="Skip" onClick={() => skip(top)} className="grid h-14 w-14 place-items-center rounded-full border border-line bg-white text-danger shadow-card"><X size={24} /></button>
            <button aria-label="Hire" onClick={() => setHiring(top)} className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand text-white shadow-lg"><Heart size={30} /></button>
            <button aria-label="Message" onClick={() => message(top)} className="grid h-14 w-14 place-items-center rounded-full border border-line bg-white text-blue-500 shadow-card"><MessageCircle size={22} /></button>
          </div>
          <p className="mt-3 text-center text-[12px] text-subtle">Swipe right to hire, left to skip</p>
        </>
      )}
      {hiring && <HireSheet worker={hiring} onClose={() => setHiring(null)} />}
    </Screen>
  );
}

function ReviewList({ userId, role }: { userId: number; role: "worker" | "employer" }) {
  const { data } = useApi<Review[]>(`/reviews/?user=${userId}&role=${role}`);
  if (!data) return <Spinner />;
  if (!data.length) return <p className="text-[13px] text-subtle">No reviews yet.</p>;
  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((r) => (
        <div key={r.id} className="card-soft border border-line">
          <div className="flex justify-between text-[12.5px]"><b>{r.reviewer_name} {r.job_location && `(${r.job_location.split(",")[0]})`}</b><span className="text-subtle">{ago(r.created_at)}</span></div>
          <Rating value={r.rating} className="mt-1" />
          {r.comment && <p className="mt-1 text-[13px] text-muted">"{r.comment}"</p>}
        </div>
      ))}
    </div>
  );
}

export function WorkerProfilePage() {
  const { id } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const { data: w, loading } = useApi<PublicWorker>(`/workers/${id}/`);
  const [hiring, setHiring] = useState(false);
  if (loading || !w) return <Spinner />;
  const canHire = me?.role === "employer" && me.employer_profile?.status === "active";
  return (
    <Screen header={<Header title="Worker Profile" center />} className="relative"
      footer={canHire ? <Button onClick={() => setHiring(true)}>Hire {w.full_name}</Button>
        : <Button variant="outline" onClick={async () => { const c = await post<{ id: number }>("/conversations/", { user_id: w.user_id }); navigate(`/messages/${c.id}`); }}>Message {w.full_name.split(" ")[0]}</Button>}>
      <div className="mt-5 flex items-center gap-4">
        <Avatar src={w.profile_photo} name={w.full_name} size={68} ring />
        <div>
          <div className="text-[19px] font-bold">{w.full_name}</div>
          <div className="mt-1 flex items-center gap-2">{w.is_verified && <VerifiedBadge />}<Rating value={w.rating} count={w.review_count} /></div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Reliability Score" value={`${Math.round(Number(w.reliability_score))} / 100`} accent />
        <Stat label="Jobs Completed" value={`${w.completed_jobs} Gigs`} />
      </div>
      {w.availability_status === "available" && (
        <div className="mt-3 rounded-xl bg-brand-soft px-4 py-2.5 text-[13px] font-semibold text-brand-dark">● Available Now near {w.location?.split(",")[0] || "you"}{w.distance_km != null && ` • ${km(w.distance_km)}`}</div>
      )}
      <Section title="Skills & Services"><div className="flex flex-wrap gap-2">{w.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div></Section>
      {w.daily_rate && <Section title="Usual rate"><p className="text-[15px] font-bold text-brand-dark">{naira(w.daily_rate)} <span className="text-[12px] font-normal text-subtle">per day</span></p></Section>}
      <Section title={`About ${w.full_name.split(" ")[0]}`}><p className="text-[13.5px] leading-relaxed text-muted">{w.bio || "No bio yet."}</p></Section>
      <Section title="Reviews"><ReviewList userId={w.user_id} role="worker" /></Section>
      {hiring && <HireSheet worker={w} onClose={() => setHiring(false)} />}
    </Screen>
  );
}

export function EmployerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: e, loading } = useApi<PublicEmployer>(`/employers/${id}/`);
  if (loading || !e) return <Spinner />;
  const items: [boolean, string][] = [[e.verification.identity, "Government ID Verified"], [e.verification.address, "Office / House Address Verified"], [e.verification.payment, "Secure Payment Method Linked"]];
  return (
    <Screen header={<Header title="Employer Profile" center />}
      footer={<Button onClick={async () => { const c = await post<{ id: number }>("/conversations/", { user_id: e.user_id }); navigate(`/messages/${c.id}`); }}>Contact {e.full_name}</Button>}>
      <div className="mt-5 flex items-center gap-4">
        <Avatar src={e.profile_photo} name={e.full_name} size={68} ring />
        <div>
          <div className="text-[19px] font-bold">{e.full_name}</div>
          <div className="mt-1 flex items-center gap-2">{e.is_verified && <VerifiedBadge />}<Rating value={e.rating} count={`${e.completed_jobs} hires`} /></div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Jobs Posted" value={`${e.jobs_posted} Posts`} />
        <Stat label="Completed" value={`${e.completed_jobs} Jobs`} accent />
      </div>
      <Section title="Employer Verification">
        <div className="card-soft space-y-2.5 border border-line">
          {items.map(([ok, label]) => (
            <div key={label} className={cx("flex items-center gap-2 text-[13px] font-semibold", ok ? "text-ink" : "text-subtle")}>
              <span className={cx("grid h-5 w-5 place-items-center rounded-full border-2", ok ? "border-brand text-brand" : "border-line")}>{ok && "✓"}</span>{label}
            </div>
          ))}
        </div>
      </Section>
      <Section title={`About ${e.full_name.split(" ")[0]}`}><p className="text-[13.5px] leading-relaxed text-muted">{e.bio || "No bio yet."}</p></Section>
      <Section title="Worker Reviews"><ReviewList userId={e.user_id} role="employer" /></Section>
    </Screen>
  );
}
