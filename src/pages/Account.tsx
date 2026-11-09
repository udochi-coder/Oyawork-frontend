import { AlertTriangle, ArrowUpRight, Bell, Briefcase, CheckCircle2, ChevronRight, LogOut, MapPin, Phone, Send, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { Avatar, Button, CheckRow, Empty, ErrorNote, Field, Header, InfoNote, Rating, Screen, Section, Spinner, Stat, VerifiedBadge, cx } from "../components/ui";
import { ApiError, api, form, get, patch, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EMPLOYER_RULES, NIGERIAN_BANKS, WORKER_RULES } from "../lib/content";
import { ago, clock, naira } from "../lib/format";
import { useAction, useApi } from "../lib/hooks";
import type { ChatMessage, Conversation, Me, Notification, WalletInfo } from "../lib/types";

export function WalletPage() {
  const { me } = useAuth();
  const { data, loading, reload } = useApi<WalletInfo>("/wallet/");
  const [mode, setMode] = useState<"none" | "withdraw" | "fund">("none");
  const [w, setW] = useState({ amount: "", bank_name: "GTBank", account_number: "", account_name: me?.full_name || "" });
  const withdraw = useAction(async () => {
    await post("/wallet/withdraw/", { ...w, amount: w.amount.replace(/\D/g, "") });
    setMode("none");
    setW({ ...w, amount: "" });
    await reload();
  });
  const fund = useAction(async () => {
    const res = await post<any>("/wallet/fund/", { amount: w.amount.replace(/\D/g, ""), method: "bank_transfer" });
    if (res.authorization_url) window.location.href = res.authorization_url;
    else {
      setMode("none");
      await reload();
    }
  });
  if (loading && !data) return <Spinner />;
  return (
    <Screen header={<Header title="Wallet" back={false} right={<span className="pill">{me?.role === "worker" ? "Earnings" : "Payments"}</span>} />} nav={<BottomNav />}>
      <div className="mt-4 rounded-2xl bg-ink p-5 text-white">
        <div className="flex items-center justify-between text-[12.5px] text-gray-300">Available Balance <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand-dark">ACTIVE</span></div>
        <div className="mt-2 text-[32px] font-bold">{naira(data?.balance)}</div>
        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-[13px]">
          <span className="text-gray-300">Pending Escrow</span><span className="font-bold text-brand">{naira(data?.pending_escrow)}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => setMode(mode === "withdraw" ? "none" : "withdraw")}>Withdraw to Bank</Button>
        <Button variant="outline" onClick={() => setMode(mode === "fund" ? "none" : "fund")}>Fund Wallet</Button>
      </div>
      {mode !== "none" && (
        <div className="card mt-3 space-y-3">
          <Field label="Amount (₦)"><input className="input" inputMode="numeric" value={w.amount} onChange={(e) => setW({ ...w, amount: e.target.value.replace(/\D/g, "") })} placeholder="10000" /></Field>
          {mode === "withdraw" ? (
            <>
              <Field label="Bank">
                <select className="input" value={w.bank_name} onChange={(e) => setW({ ...w, bank_name: e.target.value })}>{NIGERIAN_BANKS.map((b) => <option key={b}>{b}</option>)}</select>
              </Field>
              <Field label="Account number"><input className="input" inputMode="numeric" maxLength={10} value={w.account_number} onChange={(e) => setW({ ...w, account_number: e.target.value.replace(/\D/g, "") })} placeholder="0123456789" /></Field>
              <Field label="Account name"><input className="input" value={w.account_name} onChange={(e) => setW({ ...w, account_name: e.target.value })} /></Field>
              <Button busy={withdraw.busy} disabled={!w.amount || w.account_number.length !== 10} onClick={() => withdraw.run()}>Request withdrawal</Button>
              <ErrorNote>{withdraw.error}</ErrorNote>
            </>
          ) : (
            <>
              {data?.demo_payments && <InfoNote tone="warn">Test mode: top-ups are simulated until a Paystack key is added.</InfoNote>}
              <Button busy={fund.busy} disabled={!w.amount} onClick={() => fund.run()}>Fund with Paystack</Button>
              <ErrorNote>{fund.error}</ErrorNote>
            </>
          )}
        </div>
      )}
      <Section title="Recent Transactions">
        {!data?.transactions.length ? <Empty title="No transactions yet" /> : (
          <div className="space-y-2">
            {data.transactions.map((t) => {
              const n = Number(t.amount);
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3.5">
                  <div><div className="text-[14px] font-semibold">{t.description || t.kind_label}</div>
                    <div className="text-[11.5px] text-subtle">{new Date(t.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} • {t.status === "pending" ? "Processing" : t.status === "success" ? "Success" : "Failed"}</div></div>
                  <span className={cx("ml-3 whitespace-nowrap font-bold", n >= 0 ? "text-brand-dark" : "text-danger")}>{n >= 0 ? "+" : "-"}{naira(Math.abs(n))}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </Screen>
  );
}

const NOTE_ICON: Record<string, React.ReactNode> = {
  tracking: <MapPin size={17} />, job: <Briefcase size={17} />, offer: <ArrowUpRight size={17} />, booking: <Briefcase size={17} />,
  payment: <CheckCircle2 size={17} />, dispute: <AlertTriangle size={17} />, message: <Send size={17} />, review: <ShieldCheck size={17} />,
};

function noteLink(n: Notification) {
  if (n.data.booking) return `/bookings/${n.data.booking}`;
  if (n.data.hiring_request) return `/requests/${n.data.hiring_request}`;
  if (n.data.dispute) return `/disputes/${n.data.dispute}`;
  if (n.data.conversation) return `/messages/${n.data.conversation}`;
  if (n.data.job) return `/jobs/${n.data.job}`;
  return "/home";
}

export function NotificationsPage() {
  const { data, reload, loading } = useApi<{ unread: number; results: Notification[] }>("/notifications/", 15000);
  const markAll = useAction(async () => {
    await post("/notifications/mark-all-read/");
    await reload();
  });
  return (
    <Screen header={<Header title="Notifications" right={<button className="pill" onClick={() => markAll.run()}>Mark all read</button>} />} nav={<BottomNav />}>
      {loading && !data ? <Spinner /> : !data?.results.length ? <Empty icon={<Bell size={22} />} title="You're all caught up" /> : (
        <div className="mt-4 space-y-2">
          {data.results.map((n) => (
            <Link key={n.id} to={noteLink(n)} onClick={() => !n.is_read && post(`/notifications/${n.id}/read/`).catch(() => {})}
              className={cx("flex items-center gap-3 rounded-2xl border p-3.5", n.is_read ? "border-line bg-white" : "border-brand bg-brand-soft")}>
              <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white", n.is_read ? "bg-muted" : "bg-brand")}>{NOTE_ICON[n.kind] || <Bell size={17} />}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{n.title}</div>
                {n.body && <div className="truncate text-[12px] text-muted">{n.body}</div>}
                <div className="text-[11px] text-subtle">{ago(n.created_at)}</div>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-brand" />}
            </Link>
          ))}
        </div>
      )}
    </Screen>
  );
}

export function MessagesPage() {
  const { data, loading } = useApi<Conversation[]>("/conversations/", 10000);
  return (
    <Screen header={<Header title="Messages" back={false} />} nav={<BottomNav />}>
      {loading && !data ? <Spinner /> : !data?.length ? <Empty icon={<Send size={22} />} title="No conversations yet">Message a worker or employer from their profile.</Empty> : (
        <div className="mt-3 divide-y divide-line">
          {data.map((c) => (
            <Link key={c.id} to={`/messages/${c.id}`} className="flex items-center gap-3 py-3">
              <Avatar src={c.other_user.photo} name={c.other_user.full_name} size={46} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between"><span className="font-semibold">{c.other_user.full_name}</span>
                  {c.last_message && <span className="text-[11px] text-subtle">{ago(c.last_message.created_at)}</span>}</div>
                <div className={cx("truncate text-[13px]", c.unread ? "font-semibold text-ink" : "text-muted")}>{c.last_message ? `${c.last_message.is_mine ? "You: " : ""}${c.last_message.body}` : "Say hello 👋"}</div>
              </div>
              {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{c.unread}</span>}
            </Link>
          ))}
        </div>
      )}
    </Screen>
  );
}

/** /messages/new?user=<id> opens or creates the chat, then redirects. */
export function NewChat() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    post<{ id: number }>("/conversations/", { user_id: Number(params.get("user")) })
      .then((c) => navigate(`/messages/${c.id}`, { replace: true }))
      .catch((e) => setError((e as Error).message));
  }, [params, navigate]);
  return error ? <Screen header={<Header title="Messages" />}><ErrorNote>{error}</ErrorNote></Screen> : <Spinner />;
}

export function ChatPage() {
  const { id } = useParams();
  const convo = useApi<Conversation>(`/conversations/${id}/`);
  const msgs = useApi<ChatMessage[]>(`/conversations/${id}/messages/`, 4000);
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const send = useAction(async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    const m = await post<ChatMessage>(`/conversations/${id}/messages/`, { body: text });
    msgs.setData([...(msgs.data || []), m]);
  });
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.data?.length]);
  const other = convo.data?.other_user;
  const profileLink = other ? (other.role === "worker" && other.worker_id ? `/workers/${other.worker_id}` : other.employer_id ? `/employers/${other.employer_id}` : "#") : "#";
  return (
    <div className="flex h-full flex-col">
      <Header title={other ? (
        <Link to={profileLink} className="flex items-center gap-2">
          <Avatar src={other.photo} name={other.full_name} size={34} />
          <span className="leading-tight">{other.full_name}<span className={cx("block text-[11px] font-semibold", other.online ? "text-brand" : "text-subtle")}>{other.online ? "● ONLINE" : other.role}</span></span>
        </Link>
      ) : "Chat"} right={other && <a href={`tel:${other.phone_number}`} aria-label="Call" className="grid h-9 w-9 place-items-center rounded-full border border-line"><Phone size={16} /></a>} />
      <main className="flex-1 space-y-2 overflow-y-auto bg-white px-4 py-4">
        {msgs.loading && !msgs.data ? <Spinner /> : msgs.data?.map((m) => (
          <div key={m.id} className={cx("flex", m.is_mine ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px]", m.is_mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-field text-ink")}>
              {m.body}
              {m.offer && <div className="mt-2 rounded-xl border border-brand bg-brand-soft p-2 text-ink"><b>{naira(m.offer.amount)}</b> • {m.offer.location}</div>}
              <div className={cx("mt-1 text-right text-[10px]", m.is_mine ? "text-white/80" : "text-subtle")}>{clock(m.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </main>
      <form onSubmit={(e) => { e.preventDefault(); send.run(); }} className="flex items-center gap-2 border-t border-line bg-white px-4 py-3">
        <input className="input rounded-full py-3" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type message..." />
        <button aria-label="Send" disabled={!body.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-50"><Send size={18} /></button>
      </form>
    </div>
  );
}

export function ProfilePage() {
  const { me, setMe, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const isWorker = me?.role === "worker";
  const profile = isWorker ? me?.worker_profile : me?.employer_profile;
  const [v, setV] = useState({ bio: profile?.bio || "", address: profile?.address || "", email: me?.email || "", full_name: me?.full_name || "" });
  const photoRef = useRef<HTMLInputElement>(null);
  const save = useAction(async () => {
    await patch("/me/", { full_name: v.full_name, email: v.email || null });
    await patch(isWorker ? "/me/worker/" : "/me/employer/", { bio: v.bio, address: v.address });
    setMe(await get<Me>("/me/"));
    setEditing(false);
  });
  const photo = useAction(async (file: File) => {
    await api(isWorker ? "/me/worker/" : "/me/employer/", { method: "PATCH", body: form({ profile_photo: file }) });
    setMe(await get<Me>("/me/"));
  });
  if (!me || !profile) return <Spinner />;
  const wp = me.worker_profile;
  return (
    <Screen header={<Header title={isWorker ? "Worker Profile" : "Employer Profile"} back={false} center />} nav={<BottomNav />}>
      <div className="mt-5 flex items-center gap-4">
        <button onClick={() => photoRef.current?.click()} aria-label="Change photo"><Avatar src={profile.profile_photo} name={me.full_name} size={68} ring /></button>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo.run(e.target.files[0])} />
        <div className="flex-1">
          <div className="text-[19px] font-bold">{me.full_name}</div>
          <div className="mt-1 flex items-center gap-2">{profile.status === "active" ? <VerifiedBadge /> : <span className="text-[11px] font-bold text-warn">PENDING</span>}
            <Rating value={profile.rating} count={profile.review_count} /></div>
          <div className="mt-0.5 text-[12px] text-subtle">{me.phone_number}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {isWorker && wp ? <>
          <Stat label="Reliability Score" value={`${Math.round(Number(wp.reliability_score))} / 100`} accent />
          <Stat label="Jobs Completed" value={`${wp.completed_jobs} Gigs`} />
        </> : <>
          <Stat label="Completed" value={`${profile.completed_jobs} Jobs`} accent />
          <Stat label="Rating" value={Number(profile.rating) ? Number(profile.rating).toFixed(1) : "New"} />
        </>}
      </div>
      {!me.verification.complete && <Link to="/verify/identity" className="mt-3 block"><InfoNote tone="warn" icon={<ShieldCheck size={15} />}>Finish your verification →</InfoNote></Link>}

      {editing ? (
        <div className="card mt-5 space-y-3">
          <Field label="Full name"><input className="input" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></Field>
          <Field label="Email (optional)"><input className="input" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
          <Field label="Address"><input className="input" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></Field>
          <Field label={isWorker ? "About you" : "About you / your business"}><textarea className="input min-h-[90px]" value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run()}>Save</Button></div>
          <ErrorNote>{save.error}</ErrorNote>
        </div>
      ) : (
        <>
          {isWorker && wp && <Section title="Skills & Services" action={<Link to="/onboarding/skills" className="text-[13px] font-semibold text-brand-dark">Edit</Link>}>
            <div className="flex flex-wrap gap-2">{wp.skills.length ? wp.skills.map((s) => <span key={s} className="chip">{s}</span>) : <span className="sub">No skills yet</span>}</div>
          </Section>}
          <Section title="About" action={<button onClick={() => setEditing(true)} className="text-[13px] font-semibold text-brand-dark">Edit profile</button>}>
            <p className="text-[13.5px] leading-relaxed text-muted">{profile.bio || "Tell people a little about yourself."}</p>
            {profile.address && <p className="mt-2 flex items-center gap-1 text-[13px] text-subtle"><MapPin size={13} /> {profile.address}</p>}
          </Section>
        </>
      )}

      <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
        {[
          ["/switch-mode", <UserRound size={17} key="u" />, `Switch to ${isWorker ? "Employer" : "Worker"} Mode`],
          ...(isWorker ? [["/onboarding/experience", <Briefcase size={17} key="b" />, "Availability & distance"]] : []),
          ["/verify/identity", <ShieldCheck size={17} key="s" />, "Verification"],
          ["/notifications", <Bell size={17} key="n" />, "Notifications"],
          ["/conduct", <AlertTriangle size={17} key="a" />, "Community Code of Conduct"],
        ].map(([to, icon, label]) => (
          <Link key={to as string} to={to as string} className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-semibold">{icon}<span className="flex-1">{label}</span><ChevronRight size={17} className="text-subtle" /></Link>
        ))}
        <button onClick={() => { logout(); navigate("/", { replace: true }); }} className="flex w-full items-center gap-3 px-4 py-3.5 text-[14px] font-semibold text-danger"><LogOut size={17} /> Log out</button>
      </div>
    </Screen>
  );
}

export function SwitchMode() {
  const { me, switchMode } = useAuth();
  const navigate = useNavigate();
  const isWorker = me?.role === "worker";
  const target = isWorker ? "employer" : "worker";
  const run = useAction(async () => {
    const updated = await switchMode(target);
    const p = target === "worker" ? updated.worker_profile : updated.employer_profile;
    if (target === "worker" && !updated.worker_profile?.skills.length) navigate("/onboarding/skills", { replace: true });
    else if (!p?.agreed_terms_at) navigate("/onboarding/agreement", { replace: true });
    else navigate("/home", { replace: true });
  });
  const wp = me?.worker_profile;
  return (
    <Screen header={<Header title="Switch Profile Mode" center />} footer={<Button busy={run.busy} onClick={() => run.run()}>Switch to {isWorker ? "Employer" : "Worker"} Mode</Button>}>
      <h2 className="h1 mt-5">Currently in {isWorker ? "Worker" : "Employer"} Mode</h2>
      <p className="sub mt-1">Your active dashboard is tailored to {isWorker ? "finding jobs and getting paid" : "hiring workers"}. Switch to {isWorker ? "hiring" : "working"} mode anytime.</p>
      <div className="mt-5 rounded-2xl border-2 border-brand bg-brand-soft p-4">
        <span className="rounded-md bg-brand px-2 py-1 text-[10.5px] font-bold text-white">ACTIVE PROFILE</span>
        <div className="mt-3 text-[17px] font-bold text-brand-dark">{isWorker ? "Worker" : "Employer"} Profile</div>
        <div className="text-[12.5px] text-brand-dark">{isWorker ? `Showcasing: ${wp?.skills.slice(0, 3).join(", ") || "no skills yet"}` : `${me?.employer_profile?.completed_jobs || 0} completed hires`}</div>
      </div>
      <div className="mt-4"><InfoNote icon={<ShieldCheck size={15} />}>Your background verification, address verification, and wallet are linked across both Worker and Employer accounts seamlessly.</InfoNote></div>
      <div className="mt-3"><ErrorNote>{run.error}</ErrorNote></div>
    </Screen>
  );
}

export function Conduct() {
  const { me } = useAuth();
  const [tab, setTab] = useState<"worker" | "employer">(me?.role === "employer" ? "employer" : "worker");
  const [agree, setAgree] = useState(false);
  const navigate = useNavigate();
  const rules = tab === "worker" ? WORKER_RULES : EMPLOYER_RULES;
  return (
    <Screen header={<Header title="Community Code of Conduct" center />}
      footer={<div className="space-y-3">
        <div className="rounded-xl border border-amber-300 bg-warn-soft px-4 py-2.5 text-[11.5px] font-bold text-warn"><AlertTriangle size={13} className="mr-1 inline" />VIOLATIONS ARE IMMEDIATELY REPORTED TO STATE SECURITY AGENCIES.</div>
        {me && <CheckRow checked={agree} onChange={setAgree}>I have read the {tab} rules.</CheckRow>}
        <Button disabled={Boolean(me) && !agree} onClick={() => navigate(-1)}>I Accept &amp; Agree</Button></div>}>
      <div className="mt-4 grid grid-cols-2 rounded-xl bg-field p-1">
        {(["worker", "employer"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("rounded-lg py-2 text-[13px] font-semibold", tab === t ? "bg-white shadow-card" : "text-subtle")}>{t === "worker" ? "Worker Rules" : "Employer Rules"}</button>
        ))}
      </div>
      <h2 className="mt-5 text-[17px] font-bold">Required OyaWork Conduct</h2>
      <p className="sub mt-1">By {tab === "worker" ? "finding jobs" : "hiring"} through OyaWork, you agree to uphold our fundamental rules.</p>
      <div className="mt-4 space-y-4">
        {rules.map(([title, body]) => (
          <div key={title} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger"><AlertTriangle size={15} /></span>
            <div><div className="text-[14px] font-semibold">{title}</div><div className="text-[12.5px] text-muted">{body}</div></div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return setError("Missing payment reference.");
    let tries = 0;
    const check = async () => {
      try {
        const r = await get<{ status: string; purpose: string; booking: number | null }>(`/payments/verify/?reference=${encodeURIComponent(reference)}`);
        if (r.status === "success") return navigate(r.booking ? `/bookings/${r.booking}` : "/wallet", { replace: true });
        if (r.status === "failed") return setError("The payment didn't go through. You have not been charged.");
        if (++tries < 10) window.setTimeout(check, 3000);
        else setError("We're still waiting for Paystack to confirm. Check your booking in a minute.");
      } catch (e) {
        setError((e as ApiError).message);
      }
    };
    check();
  }, [params, navigate]);
  return (
    <Screen header={<Header title="Payment" back="/home" />}>
      {error ? <div className="mt-6"><ErrorNote>{error}</ErrorNote></div> : <Spinner label="Confirming your payment..." />}
    </Screen>
  );
}
