import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { downloadReport } from "../api/reports";
import { errorMessage } from "../api/client";
import { getDecision, listDecisions, predict, review } from "../api/decisions";
import FeatureContributionChart from "../components/explainability/FeatureContributionChart";
import PredictionCard from "../components/explainability/PredictionCard";
import { Badge, Empty, ErrorBox, Loading, PageHead } from "../components/ui";
import { useAsync } from "../hooks";
import { featureValue, pct, when } from "../format";
import type { Inputs } from "../types";

const blank = { annual_income: 600000, loan_amount: 150000, existing_monthly_debt: 8000, credit_utilization: 0.35, repayment_history_score: 0.9 };

function List() {
  const nav = useNavigate();
  const [cls, setCls] = useState("");
  const [form, setForm] = useState<Inputs>(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync(() => listDecisions({ predicted_class: cls }), [cls]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { const d = await predict({ ...form, applicant_label: "Manual entry (synthetic)" }); nav(`/decisions/${d.decision_id}`); }
    catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  }
  const num = (k: keyof Inputs, step = 1, label = k.replace(/_/g, " ")) => (
    <label className="field"><span>{label}</span>
      <input type="number" required step={step} value={form[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} /></label>);

  return (
    <>
      <PageHead title="Decision Explorer" sub="Open a synthetic application to see why the model scored it the way it did."
        actions={<button className="btn pri" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close form" : "New prediction"}</button>} />
      {open && (
        <form className="card formgrid" onSubmit={submit}>
          {num("annual_income", 1000, "annual income (₹)")}{num("loan_amount", 1000, "loan amount (₹)")}{num("existing_monthly_debt", 500, "existing monthly debt (₹)")}
          {num("credit_utilization", 0.01, "credit utilization (0 to 1)")}{num("repayment_history_score", 0.01, "repayment history score (0 to 1)")}
          <div className="field"><span>&nbsp;</span><button className="btn pri" disabled={busy}>{busy ? "Scoring…" : "Predict and explain"}</button></div>
          {err && <div className="state error full" role="alert">{err}</div>}
        </form>
      )}
      <div className="filters"><label className="field inline"><span>Outcome</span>
        <select value={cls} onChange={(e) => setCls(e.target.value)}><option value="">All</option><option value="approve">Approve</option><option value="review">Needs review</option><option value="reject">Reject</option></select></label></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty>No decisions match this filter.</Empty> : (
        <div className="card tbl-wrap"><table className="tbl"><thead><tr><th>ID</th><th>Applicant</th><th>When</th><th>Outcome</th><th className="r">Risk</th><th>Review</th></tr></thead>
          <tbody>{data.map((d) => (
            <tr key={d.decision_id}><td><Link to={`/decisions/${d.decision_id}`}>{d.decision_id}</Link></td><td>{d.applicant_label}</td><td>{when(d.created_at)}</td>
              <td><Badge kind={d.predicted_class} /></td><td className="r mono">{pct(d.risk_probability, 1)}</td><td>{d.review_status}</td></tr>))}</tbody></table></div>)}
    </>
  );
}

function Detail({ id }: { id: string }) {
  const { data: d, error, loading, reload, setData } = useAsync(() => getDecision(id), [id]);
  const [reviewer, setReviewer] = useState("");
  const [action, setAction] = useState("approve");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error || !d) return <ErrorBox message={error ?? "Not found"} onRetry={reload} />;

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { setData(await review(id, { reviewer, action, notes })); setNotes(""); setMsg("Saved to the audit trail."); }
    catch (x) { setMsg(errorMessage(x)); } finally { setBusy(false); }
  }
  async function pdf() { setMsg(null); try { await downloadReport(id); reload(); } catch (x) { setMsg(errorMessage(x)); } }

  return (
    <>
      <PageHead title={d.decision_id} sub={`${d.applicant_label} · scored ${when(d.created_at)} by ${d.model_version}`}
        actions={<><Link className="btn" to="/decisions">All decisions</Link><Link className="btn" to={`/decisions/${id}/simulate`}>Open What-If Lab</Link><button className="btn pri" onClick={pdf}>Download PDF report</button></>} />
      <div className="grid2">
        <PredictionCard band={d.predicted_class} risk={d.risk_probability} thresholds={d.thresholds} reasons={d.reasons} />
        <section className="card"><h3>Borrower profile <span className="tag">synthetic</span></h3>
          <dl className="dl">{(Object.keys(d.inputs) as (keyof Inputs)[]).map((k) => (<div key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{featureValue(k, d.inputs[k])}</dd></div>))}
            {d.region && <div><dt>region (not a model input)</dt><dd>{d.region}</dd></div>}{d.age_band && <div><dt>age band (not a model input)</dt><dd>{d.age_band}</dd></div>}</dl></section>
      </div>
      <section className="card"><h3>What drove this prediction</h3><FeatureContributionChart items={d.explanations} /></section>
      <div className="grid2">
        <form className="card" onSubmit={save}>
          <h3>Reviewer action <Badge kind={d.review_status}>{d.review_status}</Badge></h3>
          <label className="field"><span>Your name</span><input required value={reviewer} onChange={(e) => setReviewer(e.target.value)} maxLength={60} /></label>
          <label className="field"><span>Action</span><select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="approve">Approve</option><option value="reject">Reject</option><option value="escalate">Escalate</option><option value="note">Add note only</option></select></label>
          <label className="field"><span>Notes</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></label>
          <button className="btn pri" disabled={busy}>{busy ? "Saving…" : "Save review"}</button>{msg && <p className="small" role="status">{msg}</p>}
        </form>
        <section className="card"><h3>Audit trail</h3><ol className="timeline">{d.events.map((e) => (
          <li key={e.id}><b>{e.action.replace(/_/g, " ")}</b> <span className="muted small">{e.actor} · {when(e.ts)}</span>{e.detail && <p className="small">{e.detail}</p>}</li>))}</ol></section>
      </div>
    </>
  );
}

export default function DecisionExplorer() {
  const { id } = useParams();
  return id ? <Detail id={id} key={id} /> : <List />;
}
