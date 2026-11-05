import { ArrowLeft, BellRing, Briefcase, Check, ChevronDown, Crosshair, Info, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { BookingRow, JobCard, JobMeta } from "../components/Cards";
import { Avatar, Button, Empty, ErrorNote, Field, Header, InfoNote, Rating, Screen, Spinner, VerifiedBadge, cx } from "../components/ui";
import { ApiError, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { km, naira, when } from "../lib/format";
import { currentPosition } from "../lib/geo";
import { useAction, useApi } from "../lib/hooks";
import type { Booking, Category, HiringRequest, Job } from "../lib/types";

function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="mt-4 grid rounded-xl bg-field p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)}
          className={cx("rounded-lg py-2 text-[13px] font-semibold", value === key ? "bg-white text-ink shadow-card" : "text-subtle")}>{label}</button>
      ))}
    </div>
  );
}

const REQUEST_LABEL: Record<string, string> = {
  pending: "Waiting for reply", negotiating: "Negotiating", accepted: "Accepted", rejected: "Declined", cancelled: "Cancelled", expired: "Filled by someone else",
};

function RequestRow({ hr }: { hr: HiringRequest }) {
  const waitingOnMe = hr.can_accept;
  return (
    <Link to={hr.booking_id ? `/bookings/${hr.booking_id}` : `/requests/${hr.id}`} className="block rounded-2xl border border-line bg-white p-3.5">
      <div className="flex items-center justify-between">
        <span className="tag">{hr.job.category}</span>
        <span className="font-bold text-brand-dark">{naira(hr.current_amount)}</span>
      </div>
      <div className="mt-1.5 font-semibold">{hr.job.title}</div>
      <div className="text-[12.5px] text-muted">{hr.my_party === "worker" ? hr.employer.full_name : hr.worker.full_name} • {when(hr.job.scheduled_date, hr.job.scheduled_time)}</div>
      <div className={cx("mt-2 text-[12px] font-semibold", waitingOnMe ? "text-brand-dark" : "text-subtle")}>
        {waitingOnMe ? "Your turn: accept or counter →" : REQUEST_LABEL[hr.status]}
      </div>
    </Link>
  );
}

export function JobsTab() {
  const { me } = useAuth();
  const isWorker = me?.role === "worker";
  const [tab, setTab] = useState<string>(isWorker ? "nearby" : "jobs");
  const jobs = useApi<Job[]>(tab === "nearby" || tab === "jobs" ? "/jobs/" : null);
  const requests = useApi<HiringRequest[]>(tab === "offers" ? `/hiring-requests/?as=${me?.role}` : null, 15000);
  const bookings = useApi<Booking[]>(tab === "bookings" ? `/bookings/?as=${me?.role}` : null, 15000);
  const options: [string, string][] = isWorker ? [["nearby", "Nearby"], ["offers", "My Offers"], ["bookings", "Bookings"]]
    : [["jobs", "My Jobs"], ["offers", "Offers"], ["bookings", "Bookings"]];
  return (
    <Screen header={<Header title="Jobs" back={false} right={!isWorker && <Link to="/jobs/new" className="btn-primary btn-sm">Post a Job</Link>} />} nav={<BottomNav />}>
      <Tabs value={tab} onChange={setTab} options={options} />
      <div className="mt-4 space-y-3">
        {(tab === "nearby" || tab === "jobs") && (jobs.loading ? <Spinner /> : !jobs.data?.length ? (
          <Empty icon={<Briefcase size={22} />} title={isWorker ? "No open jobs near you right now" : "You haven't posted a job yet"}>
            {isWorker ? "Make sure you're online and your skills are up to date." : <Link to="/jobs/new" className="font-semibold text-brand-dark">Post your first job →</Link>}
          </Empty>
        ) : jobs.data.map((job) => isWorker ? <JobCard key={job.id} job={job} to={`/jobs/${job.id}`} /> : (
          <Link key={job.id} to={job.status === "open" ? `/jobs/${job.id}/interested` : `/jobs/${job.id}`} className="block rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between"><span className="tag">{job.category}</span><span className="font-bold text-brand-dark">{naira(job.offered_price)}</span></div>
            <div className="mt-1.5 font-semibold">{job.title}</div>
            <div className="text-[12.5px] text-muted">{when(job.scheduled_date, job.scheduled_time)} • {job.status === "open" ? `${job.interested_count} interested` : job.status}</div>
          </Link>
        )))}
        {tab === "offers" && (requests.loading ? <Spinner /> : !requests.data?.length ? <Empty title="No offers yet" /> :
          requests.data.map((hr) => <RequestRow key={hr.id} hr={hr} />))}
        {tab === "bookings" && (bookings.loading ? <Spinner /> : !bookings.data?.length ? <Empty title="No bookings yet" /> :
          bookings.data.map((b) => <BookingRow key={b.id} booking={b} />))}
      </div>
    </Screen>
  );
}

export function PostJob() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const directWorker = search.get("worker");
  const { me } = useAuth();
  const ep = me?.employer_profile;
  const { data: categories } = useApi<Category[]>("/categories/");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [v, setV] = useState({ category: "Cleaning", description: "", location: ep?.address || ep?.location || "", scheduled_date: tomorrow,
    scheduled_time: "10:00", offered_price: "", estimated_duration: "4", preferred_radius: "10" });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    ep?.latitude ? { latitude: Number(ep.latitude), longitude: Number(ep.longitude) } : null);
  const [mode, setMode] = useState<"gps" | "address">(ep?.latitude ? "gps" : "address");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function gps() {
    setMode("gps");
    try {
      setCoords(await currentPosition());
    } catch (err) {
      setError(new ApiError(0, { error: (err as Error).message }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cat = categories?.find((c) => c.name === v.category);
      const job = await post<Job>("/jobs/", {
        ...v, offered_price: v.offered_price.replace(/\D/g, ""), estimated_duration: Number(v.estimated_duration),
        preferred_radius: Number(v.preferred_radius), required_skills: cat?.skills.includes(cat.name) ? [cat.name] : cat?.skills.slice(0, 1) || [],
        latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
      });
      if (directWorker) {
        // Came from "Hire" on a worker: send this job straight to them.
        const hr = await post<HiringRequest>("/hiring-requests/", { job: job.id, worker: Number(directWorker) });
        navigate(`/requests/${hr.id}`, { replace: true });
      } else navigate(`/jobs/${job.id}/matching`, { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="h-full">
      <Screen header={<Header title="Post a Job Request" />} footer={<Button type="submit" busy={busy} disabled={!v.description || !v.offered_price}>Search for Workers</Button>}>
        <h2 className="h1 mt-5">What do you need done?</h2>
        <div className="mt-5 space-y-4">
          <Field label="Category" error={error?.field("category")}>
            <div className="relative">
              <select className="input appearance-none" value={v.category} onChange={set("category")}>
                {(categories || [{ name: "Cleaning" } as Category]).map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-subtle" />
            </div>
          </Field>
          <Field label="Job Description" error={error?.field("description")}>
            <textarea className="input min-h-[96px]" value={v.description} onChange={set("description")} required
              placeholder="I need someone to clean a 3-bedroom apartment including the kitchen and bathrooms." />
          </Field>
          <div>
            <span className="label">Location</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={gps} className={cx("btn-sm btn border", mode === "gps" ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white")}>
                <Crosshair size={15} /> {coords && mode === "gps" ? "Location set" : "Use Current Location"}
              </button>
              <button type="button" onClick={() => setMode("address")} className={cx("btn-sm btn border", mode === "address" ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white")}>
                Enter Address
              </button>
            </div>
            <input className="input mt-2" value={v.location} onChange={set("location")} placeholder="Lekki Phase 1, Lagos" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={error?.field("scheduled_date")}><input type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={v.scheduled_date} onChange={set("scheduled_date")} required /></Field>
            <Field label="Time"><input type="time" className="input" value={v.scheduled_time} onChange={set("scheduled_time")} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget Offer (₦)" error={error?.field("offered_price")}>
              <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-brand">
                <span className="pl-4 font-semibold">₦</span>
                <input className="w-full bg-transparent px-2 py-3.5 outline-none" inputMode="numeric" value={v.offered_price} onChange={set("offered_price")} placeholder="15,000" required />
              </div>
            </Field>
            <Field label="Duration (hours)"><input className="input" inputMode="numeric" value={v.estimated_duration} onChange={set("estimated_duration")} /></Field>
          </div>
          <InfoNote icon={<ShieldCheck size={15} />}>Your request will only be sent to verified, available workers nearby who have the required skills and meet OyaWork's reliability standards.</InfoNote>
          {error && !["category", "description", "scheduled_date", "offered_price"].some((f) => error.field(f)) && <ErrorNote>{error.message}</ErrorNote>}
        </div>
      </Screen>
    </form>
  );
}

export function Matching() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useApi<{ count: number; criteria: { key: string; label: string }[] }>(`/jobs/${id}/matches/`);
  const job = useApi<Job>(`/jobs/${id}/`);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, 5)), 450);
    return () => window.clearInterval(t);
  }, []);
  const area = job.data?.location?.split(",")[0] || "your area";
  return (
    <Screen footer={<Button onClick={() => navigate(`/jobs/${id}/interested`, { replace: true })}>View Responses</Button>} className="pt-8">
      <h2 className="h1">Finding the right workers near you...</h2>
      <p className="sub mt-1">OyaWork matching is checking your filters</p>
      <div className="card-soft mt-6 grid place-items-center border border-line py-10">
        <div className="relative grid h-28 w-28 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
          <span className="absolute inset-3 rounded-full bg-brand-soft" />
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-brand text-white"><ShieldCheck size={26} /></span>
        </div>
        <div className="mt-4 font-semibold text-brand-dark">{step < 5 ? `Scanning ${area}...` : "Scan complete"}</div>
        <div className="text-[12.5px] text-subtle">{data ? `${data.count} verified worker${data.count === 1 ? "" : "s"} found and notified` : "Searching..."}</div>
      </div>
      <h3 className="mt-6 text-[14px] font-bold">Smart Filter Criteria</h3>
      <div className="card-soft mt-3 space-y-3 border border-line">
        {(data?.criteria || []).map((c, i) => (
          <div key={c.key} className="flex items-center gap-3 text-[13.5px] font-medium">
            <span className={cx("grid h-5 w-5 place-items-center rounded-full transition", i < step ? "bg-brand text-white" : "bg-line")}><Check size={12} strokeWidth={3} /></span>
            {c.label}
          </div>
        ))}
      </div>
      {data && data.count === 0 && step >= 5 && (
        <div className="mt-4"><InfoNote tone="warn" icon={<Info size={15} />}>No matching workers are online right now. Your job stays open and workers who come online nearby will see it. You can also <Link to="/workers/find" className="font-semibold underline">browse workers</Link>.</InfoNote></div>
      )}
    </Screen>
  );
}

export function Interested() {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = useApi<Job>(`/jobs/${id}/`);
  const list = useApi<HiringRequest[]>(`/jobs/${id}/interested/`, 10000);
  const accept = useAction(async (hrId: number) => {
    const booking = await post<Booking>(`/hiring-requests/${hrId}/accept/`);
    navigate(`/bookings/${booking.id}`, { replace: true });
  });
  const cancel = useAction(async () => {
    await post(`/jobs/${id}/cancel/`);
    navigate("/jobs", { replace: true });
  });
  const open = (list.data || []).filter((hr) => ["pending", "negotiating"].includes(hr.status));
  const accepted = (list.data || []).find((hr) => hr.status === "accepted");
  return (
    <Screen header={<Header title="Workers Interested" back="/jobs" right={<span className="pill">{open.length} Active</span>} />}
      footer={<p className="text-center text-[12px] text-subtle">Payments are safe with OyaWork Escrow</p>} className="px-0">
      {job.data && <div className="bg-brand-soft px-4 py-2.5 text-[13px] font-semibold text-brand-dark">Job: {job.data.title} • Budget {naira(job.data.offered_price)}</div>}
      <div className="space-y-3 px-4 pt-4">
        {accepted?.booking_id && <Link to={`/bookings/${accepted.booking_id}`} className="block"><InfoNote tone="green">You hired {accepted.worker.full_name}. Open the booking →</InfoNote></Link>}
        {list.loading ? <Spinner /> : !open.length && !accepted ? (
          <Empty icon={<BellRing size={22} />} title="Waiting for workers to respond">Matching workers have been notified. Responses appear here automatically.
            <div className="mt-3"><Link to="/workers/find" className="font-semibold text-brand-dark">Or browse workers yourself →</Link></div></Empty>
        ) : open.map((hr) => (
          <div key={hr.id} className="rounded-2xl bg-surface p-3.5">
            <div className="flex items-center gap-3">
              <Avatar src={hr.worker.profile_photo} name={hr.worker.full_name} size={42} />
              <div className="flex-1">
                <div className="font-semibold">{hr.worker.full_name}</div>
                <div className="flex items-center gap-1.5 text-[12px] text-subtle"><Rating value={hr.worker.rating} /> • {km(hr.distance_km)}</div>
              </div>
              <div className="text-right"><div className="font-bold text-brand-dark">{naira(hr.current_amount)}</div>
                {hr.last_offer_by === "employer" && <div className="text-[10.5px] text-subtle">your offer</div>}</div>
            </div>
            {hr.message && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[12.5px] text-muted">"{hr.message}"</p>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link to={`/workers/${hr.worker.id}`} className="btn-ghost btn-sm">Profile</Link>
              <Link to={`/requests/${hr.id}`} className="btn-outline btn-sm">Counter</Link>
              <button className="btn-primary btn-sm" disabled={!hr.can_accept || accept.busy} onClick={() => accept.run(hr.id)}>
                {hr.can_accept ? "Accept" : "Waiting"}
              </button>
            </div>
          </div>
        ))}
        <ErrorNote>{accept.error || cancel.error}</ErrorNote>
        {job.data?.status === "open" && (
          <button className="mx-auto block pt-4 text-[13px] font-semibold text-danger" onClick={() => confirm("Cancel this job request?") && cancel.run()}>Cancel job request</button>
        )}
      </div>
    </Screen>
  );
}

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();
  const { data: job, loading, error } = useApi<Job>(`/jobs/${id}/`);
  const respond = useAction(async () => {
    const hr = await post<HiringRequest>(`/jobs/${id}/respond/`, {});
    navigate(`/requests/${hr.id}`, { replace: true });
  });
  const decline = useAction(async () => {
    await post(`/jobs/${id}/decline/`);
    navigate("/home", { replace: true });
  });
  if (loading) return <Spinner />;
  if (error || !job) return <Screen header={<Header title="Job" />}><Empty title="This job is no longer available" /></Screen>;
  const isOwner = me?.role === "employer";
  if (job.my_request) {
    const r = job.my_request;
    return (
      <Screen header={<Header title={job.title} />}>
        <div className="mt-4"><JobCard job={job} /></div>
        <div className="mt-4"><InfoNote tone="green">You've responded to this job ({REQUEST_LABEL[r.status]}).</InfoNote></div>
        <Link to={r.booking_id ? `/bookings/${r.booking_id}` : `/requests/${r.id}`} className="btn-primary mt-4 w-full">{r.booking_id ? "Open booking" : "View offer"}</Link>
      </Screen>
    );
  }
  return (
    <Screen header={!isOwner ? undefined : <Header title={job.title} />} className="px-0"
      footer={!isOwner && job.status === "open" ? (
        <div className="space-y-2">
          <Button busy={respond.busy} onClick={() => respond.run()}>ACCEPT {naira(job.offered_price)}</Button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => decline.run()}>DECLINE</button>
            <Link to={`/jobs/${id}/offer`} className="btn-outline">MAKE AN OFFER</Link>
          </div>
          <ErrorNote>{respond.error || decline.error}</ErrorNote>
        </div>
      ) : isOwner && job.status === "open" ? <Link to={`/jobs/${id}/interested`} className="btn-primary w-full">See interested workers ({job.interested_count})</Link> : undefined}>
      {!isOwner && (
        <div className="flex items-center gap-2 bg-brand px-2 py-2 text-[13px] font-bold text-white">
          <button aria-label="Back" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><ArrowLeft size={19} /></button>
          <BellRing size={16} /> NEW JOB NEARBY
        </div>
      )}
      <div className="space-y-4 px-4 pt-4">
        <div className="card shadow-card">
          <div className="flex items-start justify-between"><h2 className="text-[19px] font-bold">{job.title}</h2><span className="tag">{job.category}</span></div>
          <div className="mt-3"><JobMeta location={job.location} distance={job.distance_km} date={job.scheduled_date} time={job.scheduled_time} /></div>
          <div className="mt-3 border-t border-line pt-3">
            <div className="text-[12px] font-semibold text-subtle">Description</div>
            <p className="mt-1 text-[14px] leading-relaxed">{job.description}</p>
            <p className="mt-2 text-[12px] text-subtle">Estimated {job.estimated_duration} hour{job.estimated_duration === 1 ? "" : "s"}</p>
          </div>
        </div>
        {!isOwner && (
          <Link to={`/employers/${job.employer_id}`} className="card block">
            <span className="tag">Client Profile</span>
            <div className="mt-2 flex items-center gap-3">
              <Avatar src={job.employer_photo} name={job.employer} size={40} />
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{job.employer}</div><Rating value={job.employer_rating} /></div>
              {job.employer_verified && <VerifiedBadge label="VERIFIED EMPLOYER" />}
            </div>
          </Link>
        )}
        <div className="rounded-2xl border-2 border-brand bg-brand-soft py-5 text-center">
          <div className="text-[12px] font-bold tracking-wide text-brand-dark">EMPLOYER OFFER</div>
          <div className="text-[32px] font-bold text-brand-dark">{naira(job.offered_price)}</div>
        </div>
      </div>
    </Screen>
  );
}

function OfferForm({ budget, onSubmit, busy, error, cta = "Send Offer" }: {
  budget: string; onSubmit: (amount: string, message: string) => void; busy: boolean; error: string | null; cta?: string;
}) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-4">
      <div>
        <span className="label uppercase tracking-wide">Your Counter Offer</span>
        <div className="flex items-center rounded-xl border-2 border-brand bg-white">
          <span className="pl-4 text-[17px] font-bold">₦</span>
          <input className="w-full bg-transparent px-2 py-3.5 text-[17px] font-bold outline-none" inputMode="numeric" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.round(Number(budget) * 1.2))} />
        </div>
      </div>
      <Field label="OPTIONAL MESSAGE">
        <textarea className="input min-h-[84px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Due to the size of the apartment, my price is..." />
      </Field>
      <Button busy={busy} disabled={!amount} onClick={() => onSubmit(amount, message)}>{cta}</Button>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

export function FirstOffer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job } = useApi<Job>(`/jobs/${id}/`);
  const send = useAction(async (amount: string, message: string) => {
    const hr = await post<HiringRequest>(`/jobs/${id}/respond/`, { amount, message });
    navigate(`/requests/${hr.id}`, { replace: true });
  });
  if (!job) return <Spinner />;
  return (
    <Screen header={<Header title="Make an Offer" right={<span className="pill">Active</span>} />}>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-field px-4 py-3.5">
        <span className="text-[13px] font-semibold text-muted">Employer's Budget</span><span className="text-[18px] font-bold">{naira(job.offered_price)}</span>
      </div>
      <div className="mt-5"><OfferForm budget={job.offered_price} onSubmit={send.run} busy={send.busy} error={send.error} /></div>
    </Screen>
  );
}

export function RequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: hr, reload, loading } = useApi<HiringRequest>(`/hiring-requests/${id}/`, 8000);
  const counter = useAction(async (amount: string, message: string) => {
    await post(`/hiring-requests/${id}/counter/`, { amount, message });
    await reload();
  });
  const accept = useAction(async () => {
    const booking = await post<Booking>(`/hiring-requests/${id}/accept/`);
    navigate(`/bookings/${booking.id}`, { replace: true });
  });
  const reject = useAction(async () => {
    await post(`/hiring-requests/${id}/reject/`);
    await reload();
  });
  useEffect(() => {
    if (hr?.booking_id) navigate(`/bookings/${hr.booking_id}`, { replace: true });
  }, [hr?.booking_id, navigate]);
  if (loading && !hr) return <Spinner />;
  if (!hr) return <Screen header={<Header title="Offer" />}><Empty title="Offer not found" /></Screen>;
  const me = hr.my_party;
  const other = me === "worker" ? hr.employer.full_name : hr.worker.full_name;
  return (
    <Screen header={<Header title={me === "worker" ? "Make an Offer" : `Offer from ${hr.worker.full_name.split(" ")[0]}`} right={<span className="pill">{REQUEST_LABEL[hr.status]}</span>} />}
      footer={hr.can_accept ? (
        <div className="space-y-2">
          <Button busy={accept.busy} onClick={() => accept.run()}>Accept {naira(hr.current_amount)}</Button>
          <button className="w-full py-1 text-[13px] font-semibold text-danger" onClick={() => reject.run()}>Decline</button>
          <ErrorNote>{accept.error || reject.error}</ErrorNote>
        </div>
      ) : undefined}>
      <div className="mt-4 flex items-center gap-3">
        <Avatar src={me === "worker" ? hr.employer.profile_photo : hr.worker.profile_photo} name={other} size={40} />
        <div className="flex-1"><div className="font-semibold">{other}</div><div className="text-[12px] text-subtle">{hr.job.title} • {when(hr.job.scheduled_date, hr.job.scheduled_time)}</div></div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-field px-4 py-3.5">
        <span className="text-[13px] font-semibold text-muted">Employer's Budget</span><span className="text-[18px] font-bold">{naira(hr.job.offered_price)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-brand bg-brand-soft px-4 py-3.5">
        <span className="text-[13px] font-semibold text-brand-dark">Current offer ({hr.last_offer_by === me ? "yours" : hr.last_offer_by})</span>
        <span className="text-[18px] font-bold text-brand-dark">{naira(hr.current_amount)}</span>
      </div>
      {["pending", "negotiating"].includes(hr.status) ? (
        <div className="mt-5">
          {!hr.can_accept && <div className="mb-4"><InfoNote icon={<Sparkles size={14} />}>Waiting for {other.split(" ")[0]} to accept or counter. You can still change your offer.</InfoNote></div>}
          <OfferForm budget={hr.job.offered_price} onSubmit={counter.run} busy={counter.busy} error={counter.error} cta={hr.can_accept ? "Send Counter Offer" : "Update Offer"} />
        </div>
      ) : <div className="mt-5"><InfoNote tone={hr.status === "accepted" ? "green" : "muted"}>This request is {REQUEST_LABEL[hr.status].toLowerCase()}.</InfoNote></div>}
      <h3 className="mt-6 text-[12px] font-bold uppercase tracking-wide text-subtle">Negotiation History</h3>
      <div className="card-soft mt-2 space-y-2.5">
        {hr.negotiations.map((n) => (
          <div key={n.id} className={cx("flex justify-between text-[13px] font-semibold", n.sender_role === me ? "text-brand-dark" : "text-ink")}>
            <span>{n.sender_role === "employer" ? "Employer" : "Worker"}{n.sender_role === me && " (You)"}{n.message && <span className="block text-[11.5px] font-normal text-subtle">"{n.message}"</span>}</span>
            <span>{naira(n.amount)}</span>
          </div>
        ))}
      </div>
      <Link to={`/messages/new?user=${me === "worker" ? hr.employer.user_id : hr.worker.user_id}`} className="mt-4 flex items-center justify-center gap-1 text-[13px] font-semibold text-brand-dark">
        Message {other.split(" ")[0]}
      </Link>
    </Screen>
  );
}
