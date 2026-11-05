import { Check, MessageCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Empty, ErrorNote, Header, InfoNote, Screen, Spinner, cx } from "../components/ui";
import { api, form } from "../lib/api";
import { DISPUTE_REASONS, WORKER_DISPUTE_REASONS } from "../lib/content";
import { useAction, useApi } from "../lib/hooks";
import type { Booking, Dispute } from "../lib/types";

export function ReportIssue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b } = useApi<Booking>(`/bookings/${id}/`);
  const [reason, setReason] = useState("job_not_completed");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useAction(async () => {
    const d = await api<Dispute>("/disputes/", { method: "POST", body: form({ booking: id, reason, details, files }) });
    navigate(`/disputes/${d.id}`, { replace: true });
  });
  if (!b) return <Spinner />;
  const reasons = b.my_party === "worker" ? WORKER_DISPUTE_REASONS : DISPUTE_REASONS;
  return (
    <Screen header={<Header title="Report an Issue" right={<a href="/conduct" className="pill">Support Guidelines</a>} />}
      footer={<Button variant="danger" busy={submit.busy} onClick={() => submit.run()}>Submit Dispute Report</Button>}>
      <h2 className="mt-5 text-[15px] font-bold">What went wrong?</h2>
      <div className="mt-3 space-y-2">
        {reasons.map(([key, label]) => (
          <button key={key} onClick={() => setReason(key)}
            className={cx("flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-[14px] font-semibold",
              reason === key ? "border-danger bg-danger-soft text-red-700" : "border-line bg-surface")}>
            {label}<span className={cx("h-4 w-4 rounded-full border-2", reason === key ? "border-danger bg-danger" : "border-line bg-white")} />
          </button>
        ))}
      </div>
      <h3 className="label mt-5">Provide more details</h3>
      <textarea className="input min-h-[96px]" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Please describe exactly what happened. Our team will review this in detail..." />
      <h3 className="label mt-5">Attach Evidence (Photos)</h3>
      <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-line bg-surface py-4 text-[13px] font-semibold text-muted">
        <Upload size={15} className="mr-1 inline" /> {files.length ? `${files.length} file${files.length > 1 ? "s" : ""} attached` : "Upload Photo/Video Evidence"}
      </button>
      <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 6))} />
      <div className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-[12.5px] text-red-700"><b>Note:</b> Escrowed payment may be temporarily held while OyaWork support investigates.</div>
      <div className="mt-3"><ErrorNote>{submit.error}</ErrorNote></div>
    </Screen>
  );
}

export function DisputeStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: d, loading } = useApi<Dispute>(`/disputes/${id}/`, 30000);
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  if (loading && !d) return <Spinner />;
  if (!d) return <Screen header={<Header title="Dispute Status" />}><Empty title="Dispute not found" /></Screen>;
  return (
    <Screen header={<Header title={<span>Dispute Status<span className="block text-[11px] font-normal text-subtle">Ticket #{d.ticket}</span></span>} back="/home" right={<a href="/conduct" className="pill">Help</a>} />}
      footer={supportEmail ? (
        <a href={`mailto:${supportEmail}?subject=Dispute%20%23${d.ticket}`} className="btn-primary w-full"><MessageCircle size={16} /> Message Resolution Manager</a>
      ) : <p className="text-center text-[12.5px] text-subtle">A resolution manager will call you on your registered phone number.</p>}>
      <h2 className="h1 mt-5">Resolution Tracking</h2>
      <p className="sub mt-1">Reviewing progress on {d.worker_name.split(" ")[0]}'s {d.job_title.toLowerCase()} dispute: {d.reason_label.toLowerCase()}.</p>
      <ol className="mt-6">
        {d.timeline.map((step, i) => (
          <li key={step.key} className="relative flex gap-3 pb-5">
            {i < d.timeline.length - 1 && <span className={cx("absolute left-[9px] top-5 h-full w-0.5", step.state === "done" ? "bg-brand" : "bg-line")} />}
            <span className={cx("relative z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
              step.state === "done" ? "bg-brand text-white" : step.state === "current" ? "border-2 border-brand bg-white" : "border-2 border-line bg-white")}>
              {step.state === "done" && <Check size={11} strokeWidth={3} />}
            </span>
            <div><div className={cx("text-[14px] font-semibold", step.state === "upcoming" && "text-subtle")}>{step.label}</div>
              <div className="text-[12px] text-subtle">{step.description}</div></div>
          </li>
        ))}
      </ol>
      {d.resolution_note && <InfoNote tone="green">{d.resolution_note}</InfoNote>}
      <div className="card-soft mt-2 border border-line">
        <div className="text-[13px] font-bold">Linked Dispute Evidence</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {d.linked_evidence.map((e) => (
            <span key={e.label} className={cx("rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold", e.available ? "border-line bg-white" : "border-line bg-field text-subtle line-through")}>
              {e.available && "✓ "}{e.label}
            </span>
          ))}
        </div>
      </div>
      <button className="mt-4 w-full text-center text-[13px] font-semibold text-brand-dark" onClick={() => navigate(`/bookings/${d.booking}`)}>Back to booking</button>
    </Screen>
  );
}
