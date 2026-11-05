import {
  AlertTriangle, Banknote, Camera, Car, Check, CheckCircle2, CircleDot, CreditCard, Image as ImageIcon, Info, Lock, MapPin,
  MessageCircle, Navigation, Phone, ShieldCheck, Star, Upload, Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { JobMeta } from "../components/Cards";
import MapView, { toPoint } from "../components/MapView";
import { Avatar, Button, ChoiceCard, Empty, ErrorNote, Field, Header, HelpPill, InfoNote, Rating, Screen, Spinner, Steps, VerifiedBadge, cx, mediaUrl } from "../components/ui";
import { api, form, post } from "../lib/api";
import { naira, when } from "../lib/format";
import { useWatchPosition } from "../lib/geo";
import { useAction, useApi } from "../lib/hooks";
import type { Booking, WalletInfo } from "../lib/types";

type Props = { b: Booking; reload: () => Promise<unknown>; setB: (b: Booking) => void };

function useBookingAction(b: Booking, setB: (b: Booking) => void) {
  return useAction(async (action: string, body?: any) => {
    const updated = await api<Booking>(`/bookings/${b.id}/${action}/`, { method: "POST", body: body ?? {} });
    setB(updated);
    return updated;
  });
}

async function openChat(userId: number, navigate: (to: string) => void) {
  const convo = await post<{ id: number }>("/conversations/", { user_id: userId });
  navigate(`/messages/${convo.id}`);
}

function PersonCard({ label, name, photo, rating, verified, to, right }: {
  label: string; name: string; photo: string | null; rating: string; verified?: boolean; to?: string; right?: React.ReactNode;
}) {
  const body = (
    <div className="card">
      <div className="text-[11px] font-bold uppercase tracking-wide text-subtle">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        <Avatar src={photo} name={name} size={42} />
        <div className="flex-1"><div className="font-semibold">{name}</div><Rating value={rating} /></div>
        {right ?? (verified && <VerifiedBadge />)}
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function JobBox({ b, secured = true }: { b: Booking; secured?: boolean }) {
  return (
    <div className="card-soft">
      <div className="flex items-center justify-between">
        <span className="tag">{b.job.category}</span>
        {secured && b.escrow && <span className="rounded-md bg-brand px-2 py-0.5 text-[10.5px] font-bold text-white">{naira(b.agreed_price)} SECURED</span>}
      </div>
      <div className="mt-3"><JobMeta location={b.service_address || b.job.location} date={b.scheduled_date} time={b.scheduled_time} /></div>
      <div className="mt-3 border-t border-line pt-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-subtle">Description</div>
        <p className="mt-1 text-[13.5px]">{b.job.description}</p>
      </div>
      {b.for_someone_else && (
        <div className="mt-3 border-t border-line pt-3 text-[13px]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-subtle">Service for</div>
          <p className="mt-1"><b>{b.recipient_name}</b> ({b.recipient_relationship}) • {b.recipient_phone}</p>
        </div>
      )}
    </div>
  );
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return <span>{pad(Math.floor(s / 3600))} : {pad(Math.floor((s % 3600) / 60))} : {pad(s % 60)}</span>;
}

function SessionView({ b }: { b: Booking }) {
  return (
    <>
      <div className="mt-5 rounded-xl bg-brand-soft py-3 text-center text-[14px] font-bold text-brand-dark">🟢 JOB IN PROGRESS</div>
      <div className="card mt-4 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wide text-subtle">Elapsed Time</div>
        <div className="mt-1 text-[30px] font-bold tracking-wide">{b.started_at && <Elapsed since={b.started_at} />}</div>
        <div className="text-[12px] text-subtle">Started {b.started_at && when(b.started_at.slice(0, 10), new Date(b.started_at).toTimeString().slice(0, 5))}</div>
      </div>
      <div className="mt-5 space-y-4">
        {[["Job Type", b.job.title], ["Location", b.service_address || b.job.location]].map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-field"><MapPin size={17} /></span>
            <div><div className="text-[11px] font-bold uppercase tracking-wide text-subtle">{k}</div><div className="font-semibold">{v}</div></div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-field"><ShieldCheck size={17} /></span>
          <div><div className="text-[11px] font-bold uppercase tracking-wide text-subtle">Escrow Status</div>
            <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{naira(b.agreed_price)} SECURED</span></div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- employer

function EmployerPay({ b, setB }: Props) {
  const [step, setStep] = useState<2 | 3>(2);
  const [forOther, setForOther] = useState(b.for_someone_else);
  const [r, setR] = useState({ recipient_name: b.recipient_name, recipient_relationship: b.recipient_relationship, recipient_phone: b.recipient_phone,
    service_address: b.service_address || b.job.location });
  const [method, setMethod] = useState<"card" | "bank_transfer" | "wallet">("bank_transfer");
  const wallet = useApi<WalletInfo>("/wallet/");
  const act = useBookingAction(b, setB);
  const pay = useAction(async () => {
    const res = await post<any>(`/bookings/${b.id}/pay/`, { method });
    if (res.authorization_url) window.location.href = res.authorization_url;
    else setB(res as Booking);
  });
  const set = (k: keyof typeof r) => (e: React.ChangeEvent<HTMLInputElement>) => setR({ ...r, [k]: e.target.value });

  if (step === 2) {
    return (
      <Screen header={<Header title="Booking Details" right={<Steps current={2} total={3} />} />}
        footer={<Button busy={act.busy} onClick={async () => {
          const ok = await act.run("details", { for_someone_else: forOther, ...(forOther ? r : { service_address: r.service_address }) });
          if (ok) setStep(3);
        }}>Continue</Button>}>
        <div className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-[13px]">
          <b className="text-brand-dark">{b.worker.full_name}</b> accepted at <b className="text-brand-dark">{naira(b.agreed_price)}</b> for {b.job.title}.
        </div>
        <h2 className="h1 mt-5">Who is this service for?</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[[false, "Myself"], [true, "Someone Else"]].map(([v, label]) => (
            <button key={String(v)} onClick={() => setForOther(v as boolean)}
              className={cx("flex items-center gap-2 rounded-xl border px-4 py-3.5 text-[14px] font-semibold", forOther === v ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-field")}>
              <span className={cx("h-4 w-4 rounded-full border-2", forOther === v ? "border-brand bg-brand" : "border-line bg-white")} />{label as string}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-4">
          {forOther && <>
            <Field label="RECIPIENT NAME"><input className="input" value={r.recipient_name} onChange={set("recipient_name")} placeholder="Mama Grace" /></Field>
            <Field label="RELATIONSHIP"><input className="input" value={r.recipient_relationship} onChange={set("recipient_relationship")} placeholder="Mother" /></Field>
            <Field label="PHONE NUMBER"><input className="input" inputMode="tel" value={r.recipient_phone} onChange={set("recipient_phone")} placeholder="0803 123 4567" /></Field>
          </>}
          <Field label="ADDRESS"><input className="input" value={r.service_address} onChange={set("service_address")} placeholder="Lekki Phase 1" /></Field>
          {forOther && (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-soft p-3">
              <img src="/caring.jpg" alt="" className="h-16 w-16 rounded-xl object-cover" />
              <div><div className="text-[13px] font-bold text-brand-dark">Caring for Parents</div>
                <div className="text-[12px] text-muted">Verify and book trusted local help directly to your parent's home in Lagos.</div></div>
            </div>
          )}
          <ErrorNote>{act.error}</ErrorNote>
        </div>
      </Screen>
    );
  }
  const methods = [
    ["card", "Debit Card (Paystack)", <CreditCard size={17} key="c" />],
    ["bank_transfer", "Bank Transfer", <Banknote size={17} key="b" />],
    ["wallet", `OyaWork Wallet (${naira(wallet.data?.balance)})`, <Wallet size={17} key="w" />],
  ] as const;
  return (
    <Screen header={<Header title="Secure Your Payment" onBack={() => setStep(2)} />}
      footer={<Button busy={pay.busy} onClick={() => pay.run()}>Pay {naira(b.agreed_price)}</Button>}>
      <div className="mt-6 text-center">
        <div className="text-[12px] font-bold uppercase tracking-wide text-subtle">Total Payable</div>
        <div className="text-[30px] font-bold">{naira(b.agreed_price)}</div>
        <div className="text-[12px] text-subtle">Service: {b.job.title}</div>
      </div>
      <p className="mt-6 text-[12px] font-bold uppercase tracking-wide text-subtle">Choose Payment Method</p>
      <div className="mt-2 space-y-2">
        {methods.map(([key, label, icon]) => (
          <ChoiceCard key={key} selected={method === key} onClick={() => setMethod(key)} title={<span className="flex items-center gap-2">{icon}{label}</span>} />
        ))}
      </div>
      <div className="mt-4"><InfoNote tone="green" icon={<Lock size={15} />}><b>OyaWork Escrow</b> — Your payment is secured by OyaWork and released after successful job completion.</InfoNote></div>
      {wallet.data?.demo_payments && method !== "wallet" && (
        <div className="mt-3"><InfoNote tone="warn" icon={<Info size={15} />}>Test mode: card and bank payments are simulated until a Paystack key is added.</InfoNote></div>
      )}
      <div className="mt-3"><ErrorNote>{pay.error}</ErrorNote></div>
    </Screen>
  );
}

function EmployerView(props: Props) {
  const { b, setB } = props;
  const navigate = useNavigate();
  const act = useBookingAction(b, setB);
  const worker = b.worker;
  const first = worker.full_name.split(" ")[0];

  if (b.status === "pending_payment") return <EmployerPay {...props} />;

  if (b.status === "scheduled") {
    return (
      <Screen header={<Header title="Booking Confirmed" back="/jobs" right={<span className="pill">Scheduled</span>} />}
        footer={<div className="space-y-2"><Button variant="outline" onClick={() => openChat(worker.user_id, navigate)}><MessageCircle size={17} /> Message {first}</Button>
          <button className="w-full py-1 text-[13px] font-semibold text-danger" onClick={() => confirm("Cancel this booking? Your payment will be refunded to your OyaWork wallet.") && act.run("cancel", { reason: "Cancelled by employer" })}>Cancel booking</button></div>}>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[13px] font-semibold text-brand-dark"><Check size={16} /> Payment Secured in Escrow</div>
        <div className="mt-4"><JobBox b={b} /></div>
        <div className="mt-4"><PersonCard label="Worker" name={worker.full_name} photo={worker.profile_photo} rating={worker.rating} verified={worker.is_verified} to={`/workers/${worker.id}`} /></div>
        <div className="mt-4"><InfoNote icon={<Info size={15} />}>We'll notify you the moment {first} starts the journey. Your OyaCode appears here then.</InfoNote></div>
        <ErrorNote>{act.error}</ErrorNote>
      </Screen>
    );
  }

  if (b.status === "en_route" || b.status === "arrived") {
    const t = b.tracking;
    return (
      <Screen header={<Header title="Track Worker" back="/home" />} className="px-0"
        footer={<Button onClick={() => openChat(worker.user_id, navigate)}><MessageCircle size={17} /> Message Worker</Button>}>
        <div className="relative">
          <MapView worker={toPoint(t.latitude, t.longitude)} destination={toPoint(t.destination.latitude, t.destination.longitude)} height={250} />
          <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold shadow-card">
            <Navigation size={14} className="text-brand" /> {b.status === "arrived" ? `${first} has arrived` : `${first} is approaching`}
          </div>
        </div>
        <div className="space-y-4 px-4 pt-4">
          <div className="flex items-center gap-3">
            <Avatar src={worker.profile_photo} name={worker.full_name} size={44} ring />
            <div><div className="font-semibold">{first} is {b.status === "arrived" ? "at your door" : "on the way"}</div>
              <div className="text-[12px] text-subtle">Verified {worker.skills[0] || "OyaWork"} Partner</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line p-3"><div className="text-[11px] font-bold uppercase text-subtle">Estimated Arrival</div>
              <div className="mt-1 text-[17px] font-bold text-brand-dark">{b.status === "arrived" ? "Arrived" : t.eta_minutes != null ? `${t.eta_minutes} Minutes` : "Locating..."}</div></div>
            <div className="rounded-xl border border-line p-3"><div className="text-[11px] font-bold uppercase text-subtle">Remaining Distance</div>
              <div className="mt-1 text-[17px] font-bold">{t.distance_km != null ? (t.distance_km < 1 ? `${Math.round(t.distance_km * 1000)} Meters` : `${t.distance_km.toFixed(1)} km`) : "—"}</div></div>
          </div>
          <div className="rounded-2xl border-2 border-brand bg-brand-soft p-5 text-center">
            <div className="text-[12px] font-bold uppercase tracking-wide text-brand-dark">🔐 Your OyaCode • Secure Pairing Code</div>
            <div className="mt-2 text-[44px] font-bold tracking-[.3em] text-brand-dark">{b.oyacode}</div>
            <div className="text-[13px] font-semibold text-brand-dark">Give this code to your worker when they arrive.</div>
          </div>
          <InfoNote tone="warn" icon={<AlertTriangle size={15} />}><b>Do not share this code before the worker arrives at your doorstep.</b> This prevents accidental job activation.</InfoNote>
          <InfoNote icon={<ShieldCheck size={15} />}>🔐 {naira(b.agreed_price)} secured in escrow. Your funds are protected.</InfoNote>
        </div>
      </Screen>
    );
  }

  if (b.status === "in_progress") {
    return (
      <Screen header={<Header title="Current Session" back="/home" right={<HelpPill />} />}
        footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => openChat(worker.user_id, navigate)}>Message</Button>
          <Link to={`/bookings/${b.id}/report`} className="btn-danger-outline">Report an Issue</Link></div>}>
        <SessionView b={b} />
      </Screen>
    );
  }

  if (b.status === "completed") {
    return (
      <Screen header={<Header title="Confirm Completion" back="/home" right={<HelpPill />} />}
        footer={<div className="space-y-2"><Button busy={act.busy} onClick={() => act.run("confirm")}>Confirm &amp; Release Payment</Button>
          <Link to={`/bookings/${b.id}/report`} className="btn-danger-outline w-full">Report an Issue</Link><ErrorNote>{act.error}</ErrorNote></div>}>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-soft p-3.5">
          <Avatar src={worker.profile_photo} name={worker.full_name} size={40} />
          <div><div className="font-bold text-brand-dark">{first} is Finished! 🎉</div><div className="text-[12px] text-brand-dark">{first} has marked the job as completed.</div></div>
        </div>
        <h2 className="mt-5 text-[17px] font-bold">Please inspect the work</h2>
        <p className="sub mt-1">Confirm everything was done satisfactorily before releasing the escrowed funds to {first}.</p>
        <div className="card mt-4 shadow-card">
          <div className="flex items-center justify-between"><span className="tag">{b.job.category}</span><span className="text-[19px] font-bold text-brand-dark">{naira(b.agreed_price)}</span></div>
          <div className="mt-3 border-t border-line pt-3 text-[13px]">
            <div className="font-semibold">{b.service_address || b.job.location}</div>
            <div className="mt-1 text-subtle">Completed {b.completed_at && new Date(b.completed_at).toLocaleString("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}</div>
          </div>
        </div>
        {b.evidence.length > 0 && (
          <div className="mt-4"><div className="label">Job evidence</div>
            <div className="grid grid-cols-3 gap-2">{b.evidence.map((e) => (
              <a key={e.id} href={mediaUrl(e.photo)!} target="_blank" rel="noreferrer" className="relative">
                <img src={mediaUrl(e.photo)!} alt={e.kind} className="aspect-square w-full rounded-xl object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-bold uppercase text-white">{e.kind}</span>
              </a>
            ))}</div></div>
        )}
      </Screen>
    );
  }
  return <Outcome {...props} />;
}

// ---------------------------------------------------------------- worker

function WorkerEnRoute({ b, setB }: Props) {
  const { coords, error } = useWatchPosition(b.status === "en_route");
  const act = useBookingAction(b, setB);
  const lastSent = useRef(0);
  useEffect(() => {
    if (!coords || Date.now() - lastSent.current < 8000) return;
    lastSent.current = Date.now();
    post<Booking["tracking"]>(`/bookings/${b.id}/location/`, coords)
      .then((tracking) => setB({ ...b, tracking }))
      .catch(() => { /* retry on next GPS update */ });
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = b.tracking;
  const me = coords ? { lat: coords.latitude, lng: coords.longitude } : toPoint(t.latitude, t.longitude);
  return (
    <Screen header={<Header title="En Route" back="/home" />} className="px-0"
      footer={<div className="space-y-2"><Button busy={act.busy} onClick={() => act.run("arrive")}>I've Arrived</Button>
        <a href={`tel:${b.for_someone_else ? b.recipient_phone : ""}`} className="btn-ghost w-full"><Phone size={16} /> Call {b.for_someone_else ? b.recipient_name : "Employer"}</a></div>}>
      <div className="relative">
        <MapView worker={me} destination={toPoint(t.destination.latitude, t.destination.longitude)} height={300} />
        <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold shadow-card">
          <Navigation size={14} className="text-brand" /> Route active to {(b.service_address || b.job.location).split(",")[0]}
        </div>
      </div>
      <div className="space-y-3 px-4 pt-4">
        <div className="rounded-2xl bg-brand-soft p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[14px] font-bold text-brand-dark"><Car size={17} /> WORKER IS ON THE WAY</span>
            {t.eta_minutes != null && <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{t.eta_minutes} MIN</span>}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-brand-dark">
            <Navigation size={13} /> Distance to destination: {t.distance_km != null ? `${t.distance_km.toFixed(1)} km` : "waiting for GPS"}
          </div>
        </div>
        <InfoNote icon={<ShieldCheck size={15} />}>{error || "Your journey is being tracked for this active job."}</InfoNote>
        <div className="card-soft flex items-end justify-between">
          <div><div className="text-[11px] font-bold uppercase text-subtle">Active Job</div><div className="font-bold">{b.job.title}</div>
            <div className="text-[12px] text-subtle"><MapPin size={11} className="inline" /> {b.service_address || b.job.location}</div></div>
          <div className="font-bold text-brand-dark">{naira(b.agreed_price)}</div>
        </div>
        <ErrorNote>{act.error}</ErrorNote>
      </div>
    </Screen>
  );
}

function CodeEntry({ b, setB, onVerified }: Props & { onVerified: () => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const act = useBookingAction(b, setB);
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 3) refs[i + 1].current?.focus();
  };
  const code = digits.join("");
  return (
    <Screen header={<Header title="Arrival Verification" back="/home" />}
      footer={<Button busy={act.busy} disabled={code.length !== 4} onClick={async () => { if (await act.run("verify-code", { code })) onVerified(); }}>Verify Code &amp; Start</Button>}>
      <div className="mt-5 rounded-2xl border border-brand bg-brand-soft p-4 text-[14px] font-bold text-brand-dark">📍 YOU HAVE ARRIVED — You are at the job location.</div>
      <div className="card mt-4">
        <div className="flex items-center gap-3">
          <Avatar src={b.employer.profile_photo} name={b.employer.full_name} size={40} />
          <div><div className="text-[11px] font-bold uppercase text-subtle">Employer</div><div className="font-semibold">{b.employer.full_name}</div></div>
        </div>
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
          <div className="flex justify-between"><span className="text-subtle">Service Required</span><b>{b.job.category}</b></div>
          <div className="flex justify-between"><span className="text-subtle">Agreed Price</span><b className="text-brand-dark">{naira(b.agreed_price)}</b></div>
          {b.for_someone_else && <div className="flex justify-between"><span className="text-subtle">Recipient</span><b>{b.recipient_name}</b></div>}
        </div>
      </div>
      <p className="mt-6 text-center text-[14px] font-bold">Ask the employer for the OyaCode.</p>
      <div className="mt-3 flex justify-center gap-3">
        {digits.map((d, i) => (
          <input key={i} ref={refs[i]} value={d} inputMode="numeric" aria-label={`Digit ${i + 1}`} onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs[i - 1].current?.focus()}
            className="h-16 w-14 rounded-xl border-2 border-line text-center text-[26px] font-bold outline-none focus:border-brand" />
        ))}
      </div>
      <p className="mt-3 text-center text-[12px] text-subtle">Enter the 4-digit security key from the client to start.</p>
      <div className="mt-3"><ErrorNote>{act.error}</ErrorNote></div>
    </Screen>
  );
}

function EvidenceStep({ b, setB, onDone }: Props & { onDone: () => void }) {
  const [kind, setKind] = useState<"before" | "after">("after");
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const act = useBookingAction(b, setB);
  const upload = useAction(async (file: File) => {
    await api(`/bookings/${b.id}/evidence/`, { method: "POST", body: form({ kind, photo: file }) });
    setB(await api<Booking>(`/bookings/${b.id}/`));
  });
  const finish = async () => {
    if (await act.run("complete")) onDone();
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && upload.run(e.target.files[0]);
  const count = (k: string) => b.evidence.filter((e) => e.kind === k).length;
  return (
    <Screen header={<Header title="Add Job Evidence?" right={<button className="pill" onClick={finish}>Skip</button>} />}
      footer={<Button busy={act.busy} onClick={finish}>Complete &amp; Submit Evidence</Button>}>
      <p className="mt-4 text-[13px] text-muted">Photos can help protect you if there is a dispute. We recommend uploading a photo of the completed work.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["before", "after"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={cx("grid h-32 place-items-center rounded-2xl border-2 border-dashed text-center", kind === k ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface text-subtle")}>
            <div><ImageIcon size={20} className="mx-auto" /><div className="mt-1 text-[13px] font-semibold">{k === "before" ? "Before Work" : "After Work"}</div>
              <div className="text-[11px]">{count(k) ? `${count(k)} photo${count(k) > 1 ? "s" : ""}` : k === "before" ? "(Optional)" : "(Recommended)"}</div></div>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Button busy={upload.busy} onClick={() => camRef.current?.click()}><Camera size={17} /> Take Photo</Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={17} /> Upload Photo</Button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      {b.evidence.length > 0 && <div className="mt-4 grid grid-cols-4 gap-2">{b.evidence.map((e) => <img key={e.id} src={mediaUrl(e.photo)!} alt="" className="aspect-square rounded-lg object-cover" />)}</div>}
      <div className="mt-4"><InfoNote icon={<Info size={15} />}>Only photograph areas relevant to the job. Do not photograph people, private documents or personal information without permission.</InfoNote></div>
      <div className="mt-3"><ErrorNote>{upload.error || act.error}</ErrorNote></div>
    </Screen>
  );
}

function WorkerView(props: Props) {
  const { b, setB } = props;
  const navigate = useNavigate();
  const act = useBookingAction(b, setB);
  const [justVerified, setJustVerified] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const employer = b.employer;

  if (justVerified && b.status === "in_progress") {
    return (
      <Screen footer={<Button onClick={() => setJustVerified(false)}>START JOB</Button>} className="pt-10 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-soft"><span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-white"><Check size={32} strokeWidth={3} /></span></div>
        <h2 className="mt-5 text-[21px] font-bold">Code Verified Successfully</h2>
        <p className="sub mt-1">You can now start the job.</p>
        <div className="card-soft mx-auto mt-6 max-w-xs space-y-2.5 border border-line text-left text-[13.5px] font-semibold text-brand-dark">
          {["Employer Verified", "Location Confirmed", "Payment Secured"].map((x) => <div key={x} className="flex items-center gap-2"><CheckCircle2 size={17} className="text-brand" /> {x}</div>)}
        </div>
      </Screen>
    );
  }

  if (b.status === "pending_payment") {
    return (
      <Screen header={<Header title="Job Details" back="/jobs" right={<span className="pill">Awaiting payment</span>} />}
        footer={<Button variant="outline" onClick={() => openChat(employer.user_id, navigate)}><MessageCircle size={17} /> Message {employer.full_name.split(" ")[0]}</Button>}>
        <div className="mt-4"><InfoNote tone="warn" icon={<Lock size={15} />}>Offer accepted at {naira(b.agreed_price)}. Waiting for {employer.full_name.split(" ")[0]} to secure payment in escrow. Don't travel until it's secured.</InfoNote></div>
        <div className="mt-4"><JobBox b={b} secured={false} /></div>
        <div className="mt-4"><PersonCard label="Employer" name={employer.full_name} photo={employer.profile_photo} rating={employer.rating} verified={employer.is_verified} to={`/employers/${employer.id}`} /></div>
      </Screen>
    );
  }

  if (b.status === "scheduled") {
    return (
      <Screen header={<Header title="Job Details" back="/jobs" right={<span className="pill">Active</span>} />}
        footer={<div className="space-y-2"><Button busy={act.busy} onClick={() => act.run("en-route")}>EN ROUTE</Button>
          <p className="text-center text-[12px] text-subtle">Start your journey when you are ready to leave.</p><ErrorNote>{act.error}</ErrorNote></div>}>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[13px] font-semibold text-brand-dark"><Check size={16} /> Payment Secured in Escrow</div>
        <div className="mt-4"><JobBox b={b} /></div>
        <div className="mt-4"><PersonCard label="Employer" name={employer.full_name} photo={employer.profile_photo} rating={employer.rating} verified={employer.is_verified} to={`/employers/${employer.id}`} /></div>
        <div className="mt-3 flex justify-between">
          <button className="text-[13px] font-semibold text-brand-dark" onClick={() => openChat(employer.user_id, navigate)}>Message employer</button>
          <button className="text-[13px] font-semibold text-danger" onClick={() => confirm("Cancel this job? Cancelling lowers your reliability score.") && act.run("cancel", { reason: "Cancelled by worker" })}>Cancel job</button>
        </div>
      </Screen>
    );
  }

  if (b.status === "en_route") return <WorkerEnRoute {...props} />;
  if (b.status === "arrived") return <CodeEntry {...props} onVerified={() => setJustVerified(true)} />;
  if (b.status === "in_progress" && evidence) return <EvidenceStep {...props} onDone={() => setEvidence(false)} />;
  if (b.status === "in_progress") {
    return (
      <Screen header={<Header title="Current Session" back="/home" right={<HelpPill />} />}
        footer={<Button onClick={() => setEvidence(true)}>JOB COMPLETED</Button>}>
        <SessionView b={b} />
        <Link to={`/bookings/${b.id}/report`} className="mt-6 block text-center text-[13px] font-semibold text-danger">Report a problem</Link>
      </Screen>
    );
  }
  if (b.status === "completed") {
    return (
      <Screen header={<Header title="Waiting for Confirmation" back="/home" />}>
        <div className="mt-10 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand-dark"><CircleDot size={30} /></div>
          <h2 className="mt-4 text-[19px] font-bold">Job marked as completed</h2>
          <p className="sub mx-auto mt-1 max-w-xs">{employer.full_name.split(" ")[0]} is inspecting the work. {naira(b.agreed_price)} is released to your wallet as soon as they confirm.</p>
        </div>
        <div className="mt-6"><JobBox b={b} /></div>
        <Link to={`/bookings/${b.id}/report`} className="mt-4 block text-center text-[13px] font-semibold text-danger">Employer not responding? Report an issue</Link>
      </Screen>
    );
  }
  return <Outcome {...props} />;
}

function Outcome({ b }: Props) {
  const wallet = useApi<WalletInfo>(b.my_party === "worker" && b.status === "confirmed" ? "/wallet/" : null);
  const isWorker = b.my_party === "worker";
  if (b.status === "confirmed") {
    return (
      <Screen footer={<div className="space-y-2">
        {!b.has_reviewed && <Link to={`/bookings/${b.id}/review`} className="btn-primary w-full"><Star size={17} /> Rate {isWorker ? b.employer.full_name.split(" ")[0] : b.worker.full_name.split(" ")[0]}</Link>}
        <Link to="/home" className={b.has_reviewed ? "btn-primary w-full" : "btn-ghost w-full"}>Done</Link></div>} className="pt-12 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-soft"><span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-white"><Check size={32} strokeWidth={3} /></span></div>
        <h2 className="mt-5 text-[23px] font-bold">Job Completed</h2>
        <p className="mt-1 text-[14px] font-semibold text-brand-dark">Payment Released Successfully</p>
        <div className="mt-5 text-[34px] font-bold">{naira(b.agreed_price)}</div>
        {isWorker && wallet.data && (
          <div className="card mx-auto mt-6 max-w-sm text-left">
            <div className="flex justify-between text-[13px]"><span className="font-semibold">OyaWork Wallet</span><span className="text-subtle">Balance</span></div>
            <div className="mt-2 flex items-center justify-between"><span className="text-[22px] font-bold">{naira(wallet.data.balance)}</span>
              <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-dark">+{naira(b.agreed_price)}</span></div>
            <p className="mt-2 text-[12px] text-subtle">Payment has been securely processed and added to your wallet.</p>
          </div>
        )}
        {!isWorker && <p className="sub mx-auto mt-4 max-w-xs">{b.worker.full_name} has been paid. Thank you for hiring through OyaWork.</p>}
      </Screen>
    );
  }
  if (b.status === "disputed") {
    return (
      <Screen header={<Header title="Booking on hold" back="/home" />}>
        <div className="mt-6"><InfoNote tone="warn" icon={<AlertTriangle size={15} />}>A dispute is open on this booking. The escrowed payment is held until OyaWork resolves it.</InfoNote></div>
        {b.dispute_id && <Link to={`/disputes/${b.dispute_id}`} className="btn-primary mt-4 w-full">View dispute status</Link>}
      </Screen>
    );
  }
  return (
    <Screen header={<Header title="Booking cancelled" back="/home" />}>
      <Empty title="This booking was cancelled">
        {b.cancel_reason && <p>{b.cancel_reason}</p>}
        {b.escrow?.status === "refunded" && <p className="mt-1">{naira(b.agreed_price)} was refunded to the employer's OyaWork wallet.</p>}
      </Empty>
    </Screen>
  );
}

export function BookingPage() {
  const { id } = useParams();
  const { data, loading, reload, setData, error } = useApi<Booking>(`/bookings/${id}/`, 6000);
  if (loading && !data) return <Spinner />;
  if (!data) return <Screen header={<Header title="Booking" />}><Empty title={error?.message || "Booking not found"} /></Screen>;
  const props = { b: data, reload, setB: setData as (b: Booking) => void };
  return data.my_party === "employer" ? <EmployerView {...props} /> : <WorkerView {...props} />;
}

export function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b } = useApi<Booking>(`/bookings/${id}/`);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useAction(async () => {
    await post("/reviews/", { booking: Number(id), rating, comment });
    navigate("/home", { replace: true });
  });
  if (!b) return <Spinner />;
  const other = b.my_party === "worker" ? b.employer.full_name : b.worker.full_name;
  const roleLabel = b.my_party === "worker" ? "Employer" : "Worker";
  return (
    <Screen header={<Header title="Mutual Review" center />} footer={<Button busy={submit.busy} onClick={() => submit.run()}>Submit Feedback</Button>}>
      <p className="mt-1 text-center text-[12px] text-subtle">{b.job.title} Complete</p>
      <div className="mt-4"><InfoNote tone="green">Two-way ratings ensure OyaWork stays a trusted environment for everyone.</InfoNote></div>
      <h2 className="mt-6 text-[16px] font-bold">Rate {other} ({roleLabel})</h2>
      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
            <Star size={36} className={n <= rating ? "fill-sun text-sun" : "text-line"} />
          </button>
        ))}
        <span className="ml-2 self-center text-[15px] font-bold text-sun">{rating}.0</span>
      </div>
      <textarea className="input mt-4 min-h-[100px]" value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder={b.my_party === "worker" ? `"${other.split(" ")[0]} was very polite, paid instantly, and gave clear instructions."` : `"${other.split(" ")[0]} was extremely efficient, arrived early, and did a spotless job."`} />
      <div className="mt-3"><ErrorNote>{submit.error}</ErrorNote></div>
    </Screen>
  );
}
