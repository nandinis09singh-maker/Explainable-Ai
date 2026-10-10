import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monitoringSummary } from "../api/monitoring";
import { Badge, ErrorBox, Kpi, Loading, PageHead } from "../components/ui";
import { useAsync } from "../hooks";
import { pct } from "../format";

const tip = { background: "var(--surf2)", border: "1px solid var(--line)", borderRadius: 8 };

export default function Monitoring() {
  const { data: m, error, loading, reload } = useAsync(monitoringSummary, []);
  if (loading) return <Loading />;
  if (error || !m) return <ErrorBox message={error ?? "No data"} onRetry={reload} />;
  const p = m.performance;
  const cal = m.calibration.map((c) => ({ predicted: +(c.predicted * 100).toFixed(1), observed: +(c.observed * 100).toFixed(1), ideal: +(c.predicted * 100).toFixed(1) }));
  return (
    <>
      <PageHead title="Fairness &amp; Monitoring" sub={`${m.dataset.name}. Evaluation: ${m.dataset.evaluation_period}.`} />
      <div className="kpis">
        <Kpi label="ROC AUC" value={p.roc_auc.toFixed(2)} /><Kpi label="Precision (flag risky)" value={pct(p.precision_at_review_cutoff)} hint="at the review cut-off" />
        <Kpi label="Recall (flag risky)" value={pct(p.recall_at_review_cutoff)} hint="at the review cut-off" /><Kpi label="Brier score" value={p.brier_score.toFixed(3)} hint="lower is better" />
      </div>
      <div className="grid2">
        {Object.entries(m.fairness).map(([g, f]) => (
          <section className="card" key={g}>
            <div className="row between"><h3>Approval rate by {g.replace("_", " ")}</h3>
              <Badge kind={f.disparate_impact_ratio !== null && f.disparate_impact_ratio < 0.8 ? "high" : "info"}>ratio {f.disparate_impact_ratio?.toFixed(2)}</Badge></div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={f.groups.map((r) => ({ ...r, rate: +(r.approval_rate * 100).toFixed(1) }))} margin={{ top: 8, right: 8, left: -12 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="group" tick={{ fill: "var(--fg)", fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={tip} cursor={{ fill: "rgba(128,128,128,.12)" }} />
                <Bar dataKey="rate" name="Approval rate (%)" radius={[4, 4, 0, 0]}>{f.groups.map((r) => <Cell key={r.group} fill="var(--accent)" />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="muted small">Largest gap {pct(f.max_gap, 1)}. Ratio is the lowest group rate divided by the highest; below 0.80 is a common flag for review. Group attributes are synthetic and not model inputs.</p>
          </section>))}
      </div>
      <div className="grid2">
        <section className="card"><h3>Calibration</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={cal} margin={{ top: 8, right: 16, left: -8 }}><CartesianGrid stroke="var(--line)" />
              <XAxis dataKey="predicted" unit="%" tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis unit="%" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip contentStyle={tip} /><Legend /><ReferenceLine y={0} stroke="var(--line)" />
              <Line dataKey="ideal" name="Perfectly calibrated" stroke="var(--muted)" strokeDasharray="4 4" dot={false} />
              <Line dataKey="observed" name="Observed default rate" stroke="var(--accent)" strokeWidth={2.5} dot />
            </LineChart>
          </ResponsiveContainer><p className="muted small">Predicted risk (x) against how often borrowers in that bucket actually defaulted (y).</p></section>
        <section className="card"><h3>Input drift (PSI)</h3>
          <table className="tbl"><thead><tr><th>Feature</th><th className="r">PSI</th><th>Status</th></tr></thead>
            <tbody>{m.drift.map((d) => (<tr key={d.feature}><td>{d.feature.replace(/_/g, " ")}</td><td className="r mono">{d.psi.toFixed(3)}</td>
              <td><Badge kind={d.status === "alert" ? "high" : d.status === "watch" ? "medium" : "info"}>{d.status}</Badge></td></tr>))}</tbody></table>
          <p className="muted small">Compared with the training data. Under 0.10 is stable, 0.10 to 0.25 is worth watching, above 0.25 needs action. Window: {m.dataset.drift_window}.</p></section>
      </div>
      <div className="grid2">
        <section className="card"><h3>Alert history</h3><ul className="alerts">{m.alerts.map((a, i) => (
          <li key={i}><Badge kind={a.severity}>{a.severity}</Badge><span>{a.message}<span className="muted small"> · {a.date}</span></span></li>))}</ul></section>
        <section className="card"><h3>Dataset and limits</h3>
          <p className="small">Training rows {m.dataset.train_rows.toLocaleString("en-IN")} · evaluation rows {m.dataset.eval_rows.toLocaleString("en-IN")} · default rate {pct(p.default_rate, 1)}</p>
          <ul className="reasons">{m.limitations.map((l) => <li key={l}>{l}</li>)}</ul></section>
      </div>
    </>
  );
}
