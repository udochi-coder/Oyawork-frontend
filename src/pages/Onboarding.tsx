import { Briefcase, Camera, Check, Info, Lock, MapPin, Plus, ShieldCheck, Upload, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api, form, patch, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EMPLOYER_AGREEMENT, WORKER_AGREEMENT } from "../lib/content";
import { currentPosition } from "../lib/geo";
import { useApi } from "../lib/hooks";
import type { Category, Me } from "../lib/types";
import { Button, CheckRow, ChoiceCard, ErrorNote, Field, Header, HelpPill, InfoNote, Logo, Screen, cx } from "../components/ui";

export function Splash() {
  const navigate = useNavigate();
  return (
    <Screen className="flex flex-col items-center px-6 pt-12 text-center"
      footer={<div className="space-y-3"><Button onClick={() => navigate("/start")}>Get Started</Button>
        <Link to="/login" className="block py-1 text-center text-[14px] font-semibold text-muted">I already have an account</Link></div>}>
      <Logo size="lg" />
      <h1 className="mt-5 text-[22px] font-bold">Find Trusted Workers Near You</h1>
      <p className="mt-2 text-[14px] text-muted">Work. Hire. Connect.</p>
      <div className="mt-8 w-full max-w-[300px] overflow-hidden rounded-3xl bg-field">
        <img src="/hero.jpg" alt="A worker and an employer shaking hands" className="w-full" />
      </div>
    </Screen>
  );
}

export function GettingStarted() {
  const [role, setRole] = useState<"worker" | "employer">("worker");
  const navigate = useNavigate();
  return (
    <Screen header={<Header title="Getting Started" right={<HelpPill />} />}
      footer={<Button onClick={() => navigate(`/register/${role}`)}>Continue</Button>}>
      <h2 className="h1 mt-6">How will you use OyaWork?</h2>
      <p className="sub mt-1.5">Select your primary account profile. You can transition easily later.</p>
      <div className="mt-6 space-y-3">
        <ChoiceCard selected={role === "worker"} onClick={() => setRole("worker")} title="Become a Worker"
          body="Find local jobs, verify your profile and earn stable income daily."
          icon={<span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><Briefcase size={20} /></span>} />
        <ChoiceCard selected={role === "employer"} onClick={() => setRole("employer")} title="I want to Hire"
          body="Find and book verified menial workers in your immediate neighborhood."
          icon={<span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white"><UserRound size={20} /></span>} />
      </div>
      <div className="mt-4"><InfoNote icon={<Info size={15} />}>You can switch between Worker and Employer Mode anytime from your settings.</InfoNote></div>
    </Screen>
  );
}

export function Register() {
  const { role = "worker" } = useParams();
  const isWorker = role === "worker";
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [values, setValues] = useState({ full_name: "", phone_number: "", email: "", password: "", confirm_password: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [truthful, setTruthful] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = form({ ...values, email: values.email || undefined, profile_photo: photo || undefined });
      const res = await api<{ access: string; refresh: string; user: Me }>(`/${role}_register/`, { method: "POST", body, auth: false });
      setSession(res, res.user);
      navigate("/verify/identity");
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="h-full">
      <Screen header={<Header title={isWorker ? "Worker Onboarding" : "Employer Account"} right={<HelpPill />} />}
        footer={<Button type="submit" busy={busy} disabled={!truthful}>Continue</Button>}>
        <h2 className="h1 mt-5">{isWorker ? "Create your Worker Account" : "Create your Employer Account"}</h2>
        <p className="sub mt-1.5">
          {isWorker ? "Please provide your real information. We will verify these to protect you and employers."
            : "Sign up to connect with, book, and pay verified local workers safely."}
        </p>
        <div className="mt-5 flex flex-col items-center">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl bg-field text-subtle">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Camera size={28} />}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-[13px] font-semibold text-brand-dark">
            {photo ? "Change Profile Photo" : "Add Profile Photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </div>
        <div className="mt-5 space-y-4">
          <Field label="Full Name (As shown on ID)" error={error?.field("full_name")}>
            <input className="input" required value={values.full_name} onChange={set("full_name")} placeholder="Babajide Adebayo" autoComplete="name" />
          </Field>
          <Field label="Phone Number" error={error?.field("phone_number")}>
            <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="whitespace-nowrap pl-4 pr-2 text-[14px] font-semibold">+234</span>
              <input className="w-full bg-transparent py-3.5 pr-4 outline-none" required inputMode="tel" value={values.phone_number}
                onChange={set("phone_number")} placeholder="813 456 7890" autoComplete="tel-national" />
            </div>
          </Field>
          <Field label="Email Address (Optional)" error={error?.field("email")}>
            <input className="input" type="email" value={values.email} onChange={set("email")} placeholder="e.g. jide.bayo@gmail.com" autoComplete="email" />
          </Field>
          <Field label="Password" error={error?.field("password")} hint="At least 8 characters, not just numbers.">
            <input className="input" type="password" required minLength={8} value={values.password} onChange={set("password")} autoComplete="new-password" />
          </Field>
          <Field label="Confirm Password" error={error?.field("confirm_password")}>
            <input className="input" type="password" required value={values.confirm_password} onChange={set("confirm_password")} autoComplete="new-password" />
          </Field>
          <CheckRow checked={truthful} onChange={setTruthful}>I confirm that the information I provide is truthful and matches my official government records.</CheckRow>
          {error && !["full_name", "phone_number", "email", "password", "confirm_password"].some((f) => error.field(f)) && <ErrorNote>{error.message}</ErrorNote>}
          <p className="text-center text-[13px] text-muted">Already have an account? <Link to="/login" className="font-semibold text-brand-dark">Log in</Link></p>
        </div>
      </Screen>
    </form>
  );
}

function StatusRow({ title, body, state, onAction, actionLabel }: {
  title: string; body: string; state: "missing" | "submitted" | "verified"; onAction?: () => void; actionLabel?: string;
}) {
  const done = state !== "missing";
  return (
    <div className={cx("flex items-center gap-3 rounded-2xl border p-3.5", done ? "border-brand bg-white" : "border-line bg-surface")}>
      <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full", done ? "bg-brand text-white" : "bg-line")}>
        {done && <Check size={14} strokeWidth={3} />}
      </span>
      <div className="flex-1">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className={cx("text-[12px]", done ? "text-brand-dark" : "text-subtle")}>{body}</div>
      </div>
      {done ? <span className="text-[11px] font-bold text-brand-dark">{state === "verified" ? "DONE" : "SUBMITTED"}</span>
        : onAction && <button type="button" onClick={onAction} className="btn-outline btn-sm">{actionLabel || "Start"}</button>}
    </div>
  );
}

export function VerifyIdentity() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"phone" | "nin" | "face" | null>(null);
  const [otp, setOtp] = useState<{ sent: boolean; demo?: string }>({ sent: false });
  const [code, setCode] = useState("");
  const [nin, setNin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  if (!me) return null;
  const v = me.verification;
  const notes = v.notes || {};
  const isWorker = me.role === "worker";
  const masked = `+234 ${me.phone_number.slice(1, 4)} ••• ••${me.phone_number.slice(-2)}`;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const sendCode = () => run(async () => {
    const r = await post<{ sent: boolean; demo_code?: string }>("/me/verification/phone/send/");
    setOtp({ sent: true, demo: r.demo_code });
  });
  const checkCode = () => run(async () => {
    setMe(await post<Me>("/me/verification/phone/verify/", { code }));
    setPanel((p) => (p === "phone" ? null : p));
  });
  const submitDoc = (data: Record<string, any>) => run(async () => {
    const r = await api<{ me: Me }>("/me/verification/", { method: "POST", body: form(data) });
    setMe(r.me);
    if (data.doc_type === "nin") setPanel((p) => (p === "nin" ? null : p));
  });

  return (
    <Screen header={<Header title={isWorker ? "Trust & Security" : "Trust & Safety"} back="/home" right={<HelpPill />} />}
      footer={<Button disabled={v.identity === "missing"} onClick={() => navigate("/verify/address")}>Continue Verification</Button>}>
      <h2 className="h1 mt-5">Verify Your Identity</h2>
      <p className="sub mt-1.5">{isWorker ? "Verification helps employers know they are hiring a trusted and safe worker."
        : "We verify our employers to build mutual trust and safe interactions with domestic and manual workers."}</p>
      <div className={cx("mt-5 flex items-center gap-3 rounded-2xl border p-4", v.complete ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
        <span className={cx("grid h-10 w-10 place-items-center rounded-full", v.complete ? "bg-brand text-white" : "bg-line text-subtle")}><ShieldCheck size={20} /></span>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-brand-dark">
            {isWorker ? "Verified Worker Profile" : "Verified Employer Badge"}
            <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-bold", v.complete ? "bg-brand text-white" : "bg-line text-muted")}>{v.complete ? "ACTIVE" : "PENDING"}</span>
          </div>
          <div className="text-[12px] text-muted">{isWorker ? "Badge will be displayed publicly on your job card." : "Publicly visible when you publish job requests."}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <StatusRow title="Phone Verification" body={v.phone === "verified" ? `Verified via ${masked}` : "Confirm your number with an SMS code"}
          state={v.phone} onAction={() => { setPanel("phone"); }} actionLabel="Verify" />
        {panel === "phone" && (
          <div className="card space-y-3">
            {!otp.sent ? <Button busy={busy} onClick={sendCode}>Send code to {masked}</Button> : (
              <>
                {otp.demo && <InfoNote tone="warn">Test mode: SMS isn't set up yet, so your code is <b>{otp.demo}</b>.</InfoNote>}
                <input className="input text-center text-xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" />
                <Button busy={busy} disabled={code.length !== 6} onClick={checkCode}>Confirm code</Button>
              </>
            )}
          </div>
        )}
        <StatusRow title="Government ID / NIN Verification"
          body={v.identity === "verified" ? "NIN verified" : v.identity === "submitted" ? (v.face_required ? "NIN submitted; add a selfie to match it" : "NIN submitted for matching") : "Enter your 11-digit NIN"}
          state={v.identity} onAction={() => setPanel("nin")} actionLabel="Add NIN" />
        {panel === "nin" && (
          <div className="card space-y-3">
            <input className="input tracking-widest" inputMode="numeric" maxLength={11} value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))} placeholder="11-digit NIN" />
            <Button busy={busy} disabled={nin.length !== 11} onClick={() => submitDoc({ doc_type: "nin", number: nin })}>Submit NIN</Button>
          </div>
        )}
        {notes.identity && v.identity !== "verified" && <InfoNote tone={v.identity === "missing" ? "error" : "warn"}>{notes.identity}</InfoNote>}
        <StatusRow title={v.face_required ? "Facial Verification" : "Facial Verification (optional)"}
          body={v.face === "verified" ? "Your face matches your NIN photo" : v.face === "submitted" ? "Selfie submitted for matching" : "Take a selfie to match your ID photo"}
          state={v.face} onAction={() => selfieRef.current?.click()} actionLabel={notes.face ? "Retake selfie" : "Take selfie"} />
        {notes.face && v.face !== "verified" && <InfoNote tone={v.face === "missing" ? "error" : "warn"}>{notes.face}</InfoNote>}
        <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) submitDoc({ doc_type: "selfie", file: f }); }} />
        <StatusRow title="Address Verification" body={v.address !== "missing" ? "Proof of address submitted" : "Requires proof of address document"}
          state={v.address} onAction={() => navigate("/verify/address")} actionLabel="Next" />
        {notes.address && v.address !== "verified" && <InfoNote tone={v.address === "missing" ? "error" : "warn"}>{notes.address}</InfoNote>}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Screen>
  );
}

const ADDRESS_DOCS = {
  worker: [
    ["utility_bill", "Utility Bill", "Electricity (NEPA), Water, or Waste bill (issued within 3 months)"],
    ["government_document", "Government Document", "Tax clearance certificate, tenancy document, or municipal letter"],
    ["other_proof", "Other Accepted Proof", "Bank statement showing registered home address"],
  ],
  employer: [
    ["utility_bill", "Electricity or Utility Bill (IKEDC / EKEDC)", ""],
    ["government_document", "Tenancy Agreement or Rent Receipt", ""],
    ["other_proof", "Other Government Issued Address Proof", ""],
  ],
} as const;

export function VerifyAddress() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const isWorker = me?.role === "worker";
  const [docType, setDocType] = useState("utility_bill");
  const [file, setFile] = useState<File | null>(null);
  const [address, setAddress] = useState((isWorker ? me?.worker_profile?.address : me?.employer_profile?.address) || "");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!me) return null;
  const next = isWorker ? "/onboarding/skills" : "/onboarding/agreement";

  async function useGps() {
    setError(null);
    try {
      const c = await currentPosition();
      setCoords(c);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const profilePath = isWorker ? "/me/worker/" : "/me/employer/";
      await patch(profilePath, { address, location: address.split(",").slice(-2).join(",").trim() || address });
      if (coords) await post("/me/location/", { ...coords, location: address.split(",").slice(-2).join(",").trim() });
      let latest: Me | undefined;
      if (file) latest = (await api<{ me: Me }>("/me/verification/", { method: "POST", body: form({ doc_type: docType, file }) })).me;
      latest = await api<Me>("/me/");
      setMe(latest);
      navigate(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const done = me.verification.address !== "missing";
  return (
    <Screen header={<Header title={isWorker ? "Address Verification" : "Verify Address"} right={<HelpPill />} />}
      footer={<Button busy={busy} disabled={!address || (!file && !done)} onClick={submit}>{isWorker ? "Submit for Verification" : "Verify Address"}</Button>}>
      <h2 className="h1 mt-5">{isWorker ? "Verify Your Address" : "Verify Your Service Address"}</h2>
      <p className="sub mt-1.5">{isWorker ? "Select one document to confirm your physical residence." : "Confirm where the hired work will be done. This helps verify your workspace."}</p>
      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={useGps} className={cx("btn-sm btn border", coords ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white")}>
            <MapPin size={15} /> {coords ? "Location captured" : "Use Current GPS Location"}
          </button>
          <span className="btn-sm btn border border-line bg-surface text-muted">Enter Address Manually</span>
        </div>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Plot 15, Admiralty Way, Lekki Phase 1, Lagos" />
        <p className="label mt-4">Proof of Address Document</p>
        {ADDRESS_DOCS[isWorker ? "worker" : "employer"].map(([key, title, body]) => (
          <ChoiceCard key={key} selected={docType === key} onClick={() => setDocType(key)} title={title} body={body || undefined} />
        ))}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="grid w-full place-items-center gap-1.5 rounded-2xl border-2 border-dashed border-line bg-surface px-4 py-7 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card"><Upload size={18} /></span>
          <span className="text-[14px] font-semibold">Upload Document Photo</span>
          <span className="text-[12px] text-subtle">JPEG, PNG, or PDF up to 10MB</span>
          {file && <span className="text-[12px] font-semibold text-brand-dark">{file.name}</span>}
          {!file && done && <span className="text-[12px] font-semibold text-brand-dark">Document already submitted</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <InfoNote icon={<Lock size={14} />}>Your personal documents are securely protected and are not shown to {isWorker ? "employers" : "workers"}.</InfoNote>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Screen>
  );
}

export function SkillsSetup() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const { data: categories } = useApi<Category[]>("/categories/");
  const [selected, setSelected] = useState<string[]>(me?.worker_profile?.skills || []);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primary = (categories || []).map((c) => c.skills.includes(c.name) ? c.name : c.skills[0]).filter(Boolean);
  const extra = (categories || []).flatMap((c) => c.skills).filter((s) => !primary.includes(s));
  const toggle = (s: string) => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await patch("/me/worker/", { skills: selected });
      setMe(await api<Me>("/me/"));
      navigate("/onboarding/experience");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen header={<Header title="Skills & Categories" right={<HelpPill />} />}
      footer={<Button busy={busy} disabled={!selected.length} onClick={save}>Continue</Button>}>
      <h2 className="h1 mt-5">What jobs can you do?</h2>
      <p className="sub mt-1.5">Select all skills that you are qualified to do. You can edit this later.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {[...primary, ...(showAll ? extra : [])].map((s) => (
          <button key={s} type="button" onClick={() => toggle(s)} className={selected.includes(s) ? "chip-on" : "chip"}>
            {s} {selected.includes(s) && <Check size={14} strokeWidth={3} />}
          </button>
        ))}
      </div>
      {!showAll && extra.length > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-dark">
          <Plus size={15} /> Add another skill
        </button>
      )}
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
    </Screen>
  );
}

export function ExperienceSetup() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const wp = me?.worker_profile;
  const [level, setLevel] = useState(wp?.experience_level || "beginner");
  const [schedule, setSchedule] = useState<string[]>(wp?.availability_schedule?.length ? wp.availability_schedule : ["available_now"]);
  const [radius, setRadius] = useState(wp?.preferred_radius || 10);
  const [rate, setRate] = useState(wp?.daily_rate ? String(Math.round(Number(wp.daily_rate))) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (s: string) => setSchedule((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const years = { beginner: 0, intermediate: 2, experienced: 3 }[level];
      await patch("/me/worker/", { experience_level: level, experience_years: years, availability_schedule: schedule, preferred_radius: radius,
        daily_rate: rate ? rate : null });
      setMe(await api<Me>("/me/"));
      navigate("/onboarding/agreement");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const levels = [["beginner", "Beginner", "0-1 Years"], ["intermediate", "Intermediate", "1-3 Years"], ["experienced", "Experienced", "3+ Years"]] as const;
  const times = [["available_now", "Available Now"], ["weekdays", "Weekdays"], ["weekends", "Weekends"], ["custom", "Custom Schedule"]];
  return (
    <Screen header={<Header title="Experience Setup" right={<HelpPill />} />} footer={<Button busy={busy} onClick={save}>Finish Setup</Button>}>
      <h2 className="h1 mt-5">Tell us about your work</h2>
      <p className="sub mt-1.5">Configure your service availability, work experience level, and travel distance.</p>
      <p className="label mt-6">Experience Level</p>
      <div className="grid grid-cols-3 gap-2">
        {levels.map(([key, title, years]) => (
          <button key={key} type="button" onClick={() => setLevel(key)}
            className={cx("rounded-xl border px-2 py-3 text-center", level === key ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white")}>
            <div className="text-[13px] font-semibold">{title}</div>
            <div className="text-[11px] text-subtle">{years}</div>
          </button>
        ))}
      </div>
      <p className="label mt-6">When are you available for jobs?</p>
      <div className="flex flex-wrap gap-2">
        {times.map(([key, label]) => (
          <button key={key} type="button" onClick={() => toggle(key)} className={schedule.includes(key) ? "chip-on" : "chip"}>
            {label} {schedule.includes(key) && <Check size={14} strokeWidth={3} />}
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="label mb-0">Preferred Service Distance</span>
        <span className="text-[13px] font-bold text-brand-dark">{radius} km radius</span>
      </div>
      <input type="range" min={1} max={20} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="mt-3 w-full accent-brand" />
      <div className="flex justify-between text-[11px] font-semibold text-subtle"><span>1 km</span><span>10 km</span><span>20 km</span></div>
      <div className="mt-6">
        <Field label="Your usual day rate (optional)" hint="Shown to employers on your card.">
          <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-brand">
            <span className="pl-4 font-semibold">₦</span>
            <input className="w-full bg-transparent px-2 py-3.5 outline-none" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))} placeholder="10,000" />
          </div>
        </Field>
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
    </Screen>
  );
}

export function Agreement() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWorker = me?.role === "worker";
  const points = isWorker ? WORKER_AGREEMENT : EMPLOYER_AGREEMENT;
  async function submit() {
    setBusy(true);
    try {
      setMe(await post<Me>("/me/agree-terms/", { agree: true }));
      navigate("/home", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen header={<Header title={isWorker ? "Safety & Terms" : "Employer Code of Conduct"} right={<HelpPill />} />}
      footer={<Button busy={busy} disabled={!agree} onClick={submit}>Agree &amp; Continue</Button>}>
      <h2 className="h1 mt-5">{isWorker ? "OyaWork Worker Agreement" : "OyaWork Employer Agreement"}</h2>
      <p className="sub mt-1.5">{isWorker ? "Please review our trust and safety expectations. We keep the community safe for everyone."
        : "Please review our terms of safety, decent work, and payment guarantees carefully."}</p>
      <div className="card-soft mt-5 border border-line">
        <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold"><ShieldCheck size={16} className="text-brand-dark" /> Zero Tolerance Policy</div>
        <ul className="space-y-3 text-[13px] leading-snug text-muted">
          {points.map((p) => <li key={p} className="flex gap-2"><span className="text-brand">•</span>{p}</li>)}
        </ul>
      </div>
      <div className="mt-5">
        <CheckRow checked={agree} onChange={setAgree}>
          <b className="text-ink">{isWorker ? "I have read and agree to the OyaWork Worker Agreement." : "I have read, understood and agree to this Code."}</b>
        </CheckRow>
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
    </Screen>
  );
}

export function Login() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ access: string; refresh: string; user: Me }>("/auth/login/", { method: "POST", body: { phone_number: phone, password }, auth: false });
      setSession(res, res.user);
      navigate("/home", { replace: true });
    } catch (err) {
      const e = err as ApiError;
      setError(e.status === 401 ? "That phone number and password don't match." : e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="h-full">
      <Screen header={<Header title="Welcome Back" back="/" />}
        footer={<div className="space-y-3"><Button type="submit" busy={busy}>Login</Button>
          <Link to="/start" className="block text-center text-[13px] font-semibold text-muted">Create new account</Link></div>}>
        <div className="mt-8 text-center">
          <Logo size="lg" />
          <h2 className="mt-4 text-[20px] font-bold">Log In to Your Account</h2>
          <p className="sub mt-1">Enter your verified phone number to proceed.</p>
        </div>
        <div className="mt-6 space-y-4">
          <Field label="Phone Number">
            <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="whitespace-nowrap pl-4 pr-2 text-[14px] font-semibold">+234</span>
              <input className="w-full bg-transparent py-3.5 pr-4 outline-none" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="802 345 6789" autoComplete="tel-national" />
            </div>
          </Field>
          <Field label="Password">
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <Link to="/forgot-password" className="block text-right text-[13px] font-semibold text-brand-dark">Forgot Password?</Link>
        </div>
      </Screen>
    </form>
  );
}

export function ForgotPassword() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState({ a: "", b: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ demo_code?: string }>("/auth/password-reset/", { method: "POST", body: { phone_number: phone }, auth: false });
      setDemoCode(r.demo_code || null);
      setStep("reset");
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (pw.a !== pw.b) return setError(new ApiError(400, { new_password: ["Passwords do not match."] }));
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ access: string; refresh: string; user: Me }>("/auth/password-reset/confirm/", {
        method: "POST", body: { phone_number: phone, code, new_password: pw.a }, auth: false });
      setSession(res, res.user);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} className="h-full">
        <Screen header={<Header title="Reset Password" back="/login" />} footer={<Button type="submit" busy={busy} disabled={!phone}>Send Reset Code</Button>}>
          <h2 className="h1 mt-6">Forgot your password?</h2>
          <p className="sub mt-1.5">Enter the phone number on your account. We'll text you a 6-digit code to set a new password.</p>
          <div className="mt-6">
            <Field label="Phone Number">
              <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="whitespace-nowrap pl-4 pr-2 text-[14px] font-semibold">+234</span>
                <input className="w-full bg-transparent py-3.5 pr-4 outline-none" required inputMode="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="802 345 6789" autoComplete="tel-national" />
              </div>
            </Field>
          </div>
          <div className="mt-4"><ErrorNote>{error?.message}</ErrorNote></div>
        </Screen>
      </form>
    );
  }
  return (
    <form onSubmit={reset} className="h-full">
      <Screen header={<Header title="Reset Password" onBack={() => setStep("phone")} />}
        footer={<Button type="submit" busy={busy} disabled={code.length !== 6 || !pw.a}>Set New Password</Button>}>
        <h2 className="h1 mt-6">Enter your code</h2>
        <p className="sub mt-1.5">If {phone} has an OyaWork account, a code is on its way. It expires in 10 minutes.</p>
        {demoCode && <div className="mt-4"><InfoNote tone="warn">Test mode: SMS isn't set up yet, so your code is <b>{demoCode}</b>.</InfoNote></div>}
        <div className="mt-5 space-y-4">
          <Field label="6-digit code" error={error?.field("code")}>
            <input className="input text-center text-xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" autoComplete="one-time-code" />
          </Field>
          <Field label="New Password" error={error?.field("new_password")} hint="At least 8 characters, not just numbers.">
            <input className="input" type="password" required minLength={8} value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label="Confirm New Password">
            <input className="input" type="password" required value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" />
          </Field>
          {error && !error.field("code") && !error.field("new_password") && <ErrorNote>{error.message}</ErrorNote>}
          <button type="button" onClick={() => sendCode()} className="text-[13px] font-semibold text-brand-dark">Didn't get it? Send a new code</button>
        </div>
      </Screen>
    </form>
  );
}
