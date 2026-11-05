import { Bell, ChevronRight, Hammer, Leaf, Plus, Search, ShieldAlert, Sparkles, Shirt, Car, Wrench, Paintbrush } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { BookingRow, JobCard, WorkerRow } from "../components/Cards";
import { Avatar, Empty, InfoNote, Rating, Screen, Section, Spinner, Toggle, VerifiedBadge, cx } from "../components/ui";
import { get, patch, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { firstName, greeting, naira } from "../lib/format";
import { currentPosition } from "../lib/geo";
import { useAction, useApi } from "../lib/hooks";
import type { Booking, Job, Me, PublicWorker, WalletInfo } from "../lib/types";

/** Save the device location once per visit so distances and matching work. */
function useShareLocation() {
  const { setMe } = useAuth();
  useEffect(() => {
    let sent = false;
    try {
      sent = sessionStorage.getItem("oyawork.locationSent") === "1";
    } catch { /* ignore */ }
    if (sent) return;
    currentPosition()
      .then(async (c) => {
        await post("/me/location/", c);
        try { sessionStorage.setItem("oyawork.locationSent", "1"); } catch { /* ignore */ }
        setMe(await get<Me>("/me/"));
      })
      .catch(() => { /* user declined: profile address is used instead */ });
  }, [setMe]);
}

function VerifyBanner({ me }: { me: Me }) {
  const profile = me.role === "worker" ? me.worker_profile : me.employer_profile;
  if (!profile || profile.status === "active") return null;
  const submitted = me.verification.complete;
  return (
    <Link to={submitted ? "/profile" : "/verify/identity"} className="mt-4 block">
      <InfoNote tone="warn" icon={<ShieldAlert size={16} />}>
        {submitted ? "Your documents are being reviewed. You'll be able to " + (me.role === "worker" ? "take jobs" : "post jobs") + " once approved."
          : <>Finish verifying your identity and address to {me.role === "worker" ? "see job requests" : "post jobs and hire"}. <b>Continue →</b></>}
      </InfoNote>
    </Link>
  );
}

function ActiveBookings() {
  const { data } = useApi<Booking[]>("/bookings/?active=1", 15000);
  const { me } = useAuth();
  const mine = (data || []).filter((b) => b.my_party === me?.role);
  if (!mine.length) return null;
  return (
    <Section title="Active bookings">
      <div className="space-y-2">{mine.slice(0, 3).map((b) => <BookingRow key={b.id} booking={b} />)}</div>
    </Section>
  );
}

function NotificationBell() {
  const { data } = useApi<{ unread: number }>("/notifications/", 20000);
  return (
    <Link to="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-white">
      <Bell size={18} />
      {!!data?.unread && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{data.unread}</span>}
    </Link>
  );
}

export function WorkerHome() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  useShareLocation();
  const wp = me!.worker_profile!;
  const active = wp.status === "active";
  const jobs = useApi<Job[]>(active ? "/jobs/" : null, 30000);
  const wallet = useApi<WalletInfo>("/wallet/");
  const [hidden, setHidden] = useState<number[]>([]);
  const online = wp.availability_status === "available";
  const toggle = useAction(async (on: boolean) => {
    await patch("/me/worker/", { availability_status: on ? "available" : "unavailable" });
    setMe(await get<Me>("/me/"));
  });
  const decline = useAction(async (id: number) => {
    setHidden((h) => [...h, id]);
    await post(`/jobs/${id}/decline/`);
  });
  const today = new Date().toDateString();
  const earnedToday = (wallet.data?.transactions || [])
    .filter((t) => t.kind === "earning" && new Date(t.created_at).toDateString() === today)
    .reduce((s, t) => s + Number(t.amount), 0);
  const list = (jobs.data || []).filter((j) => !hidden.includes(j.id) && !j.my_request);

  return (
    <Screen nav={<BottomNav />} className="pt-4">
      <div className="flex items-center gap-3">
        <Avatar src={wp.profile_photo} name={me!.full_name} size={46} ring />
        <div className="flex-1">
          <div className="text-[16px] font-bold">{greeting()}, {firstName(me!.full_name)} 👋</div>
          {active ? <VerifiedBadge /> : <span className="text-[11px] font-bold text-warn">PENDING VERIFICATION</span>}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line px-2.5 py-1.5">
          <span className={cx("text-[11px] font-bold", online ? "text-brand-dark" : "text-subtle")}>{online ? "ONLINE" : "OFFLINE"}</span>
          <Toggle on={online} onChange={(v) => toggle.run(v)} label="Available for jobs" />
        </div>
      </div>
      <VerifyBanner me={me!} />

      <div className="mt-5 rounded-2xl bg-ink p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12.5px] text-gray-300">Today's Earnings</div>
            <div className="mt-1 text-[28px] font-bold">{naira(earnedToday)}</div>
          </div>
          <Link to="/wallet" className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold">Withdraw</Link>
        </div>
        <div className="mt-3 text-[12px] text-gray-400">Wallet balance {naira(wallet.data?.balance)}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-line p-3"><div className="text-[11.5px] text-subtle">Completed</div><div className="mt-1 font-bold">{wp.completed_jobs} Jobs</div></div>
        <div className="rounded-xl border border-line p-3"><div className="text-[11.5px] text-subtle">Rating</div><div className="mt-1"><Rating value={wp.rating} className="text-[15px] !text-ink" /></div></div>
        <div className="rounded-xl border border-line p-3"><div className="text-[11.5px] text-subtle">Reliability</div><div className="mt-1 font-bold">{Math.round(Number(wp.reliability_score))}/100</div></div>
      </div>

      <ActiveBookings />

      <Section title="Nearby Job Requests" action={<Link to="/jobs" className="text-[13px] font-semibold text-brand-dark">See All ({list.length})</Link>}>
        {!active ? <Empty title="Jobs appear once you're verified" /> :
          jobs.loading ? <Spinner /> :
          !online ? <Empty title="You're offline">Turn on Online to receive nearby job requests.</Empty> :
          !list.length ? <Empty title="No job requests nearby yet">We'll notify you as soon as an employer near you posts a job that needs your skills.</Empty> : (
            <div className="space-y-3">
              {list.slice(0, 3).map((job) => (
                <JobCard key={job.id} job={job} to={`/jobs/${job.id}`}>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-ghost btn-sm py-2.5" onClick={() => decline.run(job.id)}>Decline</button>
                    <button className="btn-primary btn-sm py-2.5" onClick={() => navigate(`/jobs/${job.id}`)}>Accept Job</button>
                  </div>
                </JobCard>
              ))}
            </div>
          )}
      </Section>
    </Screen>
  );
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Cleaning: <Sparkles size={14} />, Plumbing: <Wrench size={14} />, Painting: <Paintbrush size={14} />, Gardening: <Leaf size={14} />,
  Driving: <Car size={14} />, Laundry: <Shirt size={14} />, Carpentry: <Hammer size={14} />,
};

export function EmployerHome() {
  const { me } = useAuth();
  const navigate = useNavigate();
  useShareLocation();
  const ep = me!.employer_profile!;
  const active = ep.status === "active";
  const workers = useApi<PublicWorker[]>(active ? "/workers/" : null);
  const [q, setQ] = useState("");
  const featured = ["Cleaning", "Plumbing", "Painting", "Gardening", "Driving", "Laundry"];
  return (
    <Screen nav={<BottomNav />} className="pt-4">
      <div className="flex items-center gap-3">
        <Avatar src={ep.profile_photo} name={me!.full_name} size={46} ring />
        <div className="flex-1">
          <div className="text-[16px] font-bold">👋 Hello {firstName(me!.full_name)}</div>
          {active ? <VerifiedBadge label="VERIFIED EMPLOYER" /> : <span className="text-[11px] font-bold text-warn">PENDING VERIFICATION</span>}
        </div>
        <NotificationBell />
      </div>
      <VerifyBanner me={me!} />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link to="/workers/find" className="rounded-2xl border-2 border-brand bg-brand-soft p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><Search size={18} /></span>
          <div className="mt-3 font-semibold text-brand-dark">Find a Worker</div>
          <div className="text-[11.5px] text-muted">Swipe &amp; book immediately</div>
        </Link>
        <Link to="/jobs/new" className="rounded-2xl border border-line bg-white p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white"><Plus size={18} /></span>
          <div className="mt-3 font-semibold">Post a Job</div>
          <div className="text-[11.5px] text-muted">Request quotes from workers</div>
        </Link>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); navigate(`/workers/find?q=${encodeURIComponent(q)}`); }}
        className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface px-4">
        <Search size={17} className="text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What service do you need?" className="w-full bg-transparent py-3.5 text-[14px] outline-none" />
      </form>
      <Section title="Service Categories">
        <div className="flex flex-wrap gap-2">
          {featured.map((c) => (
            <Link key={c} to={`/workers/find?category=${encodeURIComponent(c)}`} className="chip">{CATEGORY_ICONS[c]} {c}</Link>
          ))}
        </div>
      </Section>
      <ActiveBookings />
      <Section title="Recommended Workers" action={<Link to="/workers/find" className="flex items-center text-[13px] font-semibold text-brand-dark">See all <ChevronRight size={15} /></Link>}>
        {!active ? <Empty title="Verify your account to see workers near you" /> : workers.loading ? <Spinner /> :
          !workers.data?.length ? <Empty title="No verified workers near you yet">Post a job and we'll alert workers as they join.</Empty> : (
            <div className="space-y-2">{workers.data.slice(0, 5).map((w) => <WorkerRow key={w.id} worker={w} to={`/workers/${w.id}`} />)}</div>
          )}
      </Section>
    </Screen>
  );
}

export function Home() {
  const { me } = useAuth();
  if (!me) return <Spinner />;
  return me.role === "employer" ? <EmployerHome /> : <WorkerHome />;
}
