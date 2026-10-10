import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { auditRecords } from "../api/monitoring";
import { downloadReport } from "../api/reports";
import { errorMessage } from "../api/client";
import { Badge, Empty, ErrorBox, Loading, PageHead } from "../components/ui";
import { useAsync, useDebounced } from "../hooks";
import { pct, when } from "../format";

export default function AuditReports() {
  const [f, setF] = useState({ q: "", predicted_class: "", review_status: "", date_from: "", date_to: "" });
  const deb = useDebounced(f, 300);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync(() => auditRecords(deb), [deb]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const versions = data ? Object.entries(data.reduce<Record<string, number>>((a, r) => ({ ...a, [r.model_version]: (a[r.model_version] ?? 0) + 1 }), {})) : [];

  async function pdf(id: string) { setMsg(null); try { await downloadReport(id); reload(); } catch (x) { setMsg(errorMessage(x)); } }

  return (
    <>
      <PageHead title="Audit &amp; Reports" sub="Trace any decision to its model version, explanation and reviewer actions, then export a PDF." />
      <form className="card filters" onSubmit={(e) => e.preventDefault()}>
        <label className="field"><span>Decision ID</span><input placeholder="DEMO-1001" value={f.q} onChange={set("q")} /></label>
        <label className="field"><span>Outcome</span><select value={f.predicted_class} onChange={set("predicted_class")}><option value="">All</option><option value="approve">Approve</option><option value="review">Needs review</option><option value="reject">Reject</option></select></label>
        <label className="field"><span>Review status</span><select value={f.review_status} onChange={set("review_status")}><option value="">All</option><option value="pending">Pending</option><option value="approve">Approved</option><option value="reject">Rejected</option><option value="escalate">Escalated</option></select></label>
        <label className="field"><span>From</span><input type="date" value={f.date_from} onChange={set("date_from")} /></label>
        <label className="field"><span>To</span><input type="date" value={f.date_to} onChange={set("date_to")} /></label>
        <div className="field"><span>&nbsp;</span><button type="button" className="btn" onClick={() => setF({ q: "", predicted_class: "", review_status: "", date_from: "", date_to: "" })}>Clear filters</button></div>
      </form>
      {versions.length > 0 && <p className="muted small">Model versions in these results: {versions.map(([v, n]) => `${v} (${n})`).join(", ")}</p>}
      {msg && <ErrorBox message={msg} />}
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty>No audit records match these filters.</Empty> : (
        <div className="card tbl-wrap"><table className="tbl"><thead><tr><th>ID</th><th>When</th><th>Model</th><th>Outcome</th><th className="r">Risk</th><th>Review</th><th className="r">Events</th><th /></tr></thead>
          <tbody>{data.map((r) => (
            <Fragment key={r.decision_id}>
              <tr><td><button className="linkbtn" aria-expanded={open === r.decision_id} onClick={() => setOpen(open === r.decision_id ? null : r.decision_id)}>{r.decision_id}</button></td>
                <td>{when(r.created_at)}</td><td className="mono">{r.model_version}</td><td><Badge kind={r.predicted_class} /></td><td className="r mono">{pct(r.risk_probability, 1)}</td>
                <td>{r.review_status}</td><td className="r">{r.event_count}</td><td className="r"><button className="btn sm" onClick={() => pdf(r.decision_id)}>PDF</button></td></tr>
              {open === r.decision_id && (<tr className="detail"><td colSpan={8}><div className="grid2">
                <div><h4>Explanation record</h4><ul className="reasons">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="small muted">Contributions (log-odds): {r.explanations.map((e) => `${e.label} ${e.contribution > 0 ? "+" : ""}${e.contribution.toFixed(2)}`).join(" · ")}</p>
                  <Link to={`/decisions/${r.decision_id}`} className="link">Open in Decision Explorer →</Link></div>
                <div><h4>Events</h4><ol className="timeline">{r.events.map((e) => (<li key={e.id}><b>{e.action.replace(/_/g, " ")}</b> <span className="muted small">{e.actor} · {when(e.ts)}</span>{e.detail && <p className="small">{e.detail}</p>}</li>))}</ol></div>
              </div></td></tr>)}
            </Fragment>))}</tbody></table></div>)}
    </>
  );
}
