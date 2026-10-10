import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { overview } from "../api/decisions";
import { Badge, Empty, ErrorBox, Kpi, Loading, PageHead } from "../components/ui";
import { useAsync } from "../hooks";
import { bandLabel, pct, when } from "../format";

const COLORS = { approve: "var(--good)", review: "var(--warn)", reject: "var(--bad)" } as const;

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(overview, []);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No data"} onRetry={reload} />;
  const chart = (["approve", "review", "reject"] as const).map((k) => ({ name: bandLabel(k), key: k, count: data.by_class[k] }));
  const pending = data.by_review_status.pending ?? 0;
  const fair = data.min_disparate_impact_ratio;
  return (
    <>
      <PageHead title="Overview" sub={`Synthetic demo applications scored by ${data.model_version}.`} actions={<Link className="btn pri" to="/decisions">Open Decision Explorer</Link>} />
      <div className="kpis">
        <Kpi label="Demo applications" value={data.total} />
        <Kpi label="Waiting for review" value={pending} hint={`${data.by_class.review} in the review band`} />
        <Kpi label="Model ROC AUC" value={data.roc_auc.toFixed(2)} hint="synthetic hold-out" />
        <Kpi label="Lowest approval-rate ratio" value={fair.toFixed(2)} hint={fair >= 0.8 ? "above the 0.80 guide" : "below the 0.80 guide"} />
      </div>
      <div className="grid2">
        <section className="card">
          <h3>Predictions by outcome</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -12 }}>
              <XAxis dataKey="name" tick={{ fill: "var(--fg)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(128,128,128,.12)" }} contentStyle={{ background: "var(--surf2)", border: "1px solid var(--line)", borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>{chart.map((c) => <Cell key={c.key} fill={COLORS[c.key]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="card">
          <h3>Model alerts</h3>
          {data.alerts.length === 0 ? <Empty>No alerts.</Empty> : (
            <ul className="alerts">{data.alerts.map((a, i) => (
              <li key={i}><Badge kind={a.severity}>{a.severity}</Badge><span>{a.message}</span></li>))}</ul>)}
          <Link to="/monitoring" className="link">Open monitoring →</Link>
        </section>
      </div>
      <section className="card">
        <h3>Recent decisions</h3>
        {data.recent.length === 0 ? <Empty>No decisions yet.</Empty> : (
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>ID</th><th>When</th><th>Outcome</th><th className="r">Risk</th><th>Review</th></tr></thead>
            <tbody>{data.recent.map((d) => (
              <tr key={d.decision_id}><td><Link to={`/decisions/${d.decision_id}`}>{d.decision_id}</Link></td><td>{when(d.created_at)}</td>
                <td><Badge kind={d.predicted_class} /></td><td className="r mono">{pct(d.risk_probability, 1)}</td><td>{d.review_status}</td></tr>))}</tbody></table></div>)}
      </section>
    </>
  );
}
