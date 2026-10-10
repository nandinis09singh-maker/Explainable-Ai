import { useState } from "react";
import { API_BASE } from "../api/client";
import { health } from "../api/decisions";
import { ErrorBox, Loading, PageHead } from "../components/ui";
import { useAsync } from "../hooks";
import { pct } from "../format";

export default function Settings() {
  const { data, error, loading, reload } = useAsync(health, []);
  const [key, setKey] = useState(() => { try { return localStorage.getItem("xai_api_key") ?? ""; } catch { return ""; } });
  const [saved, setSaved] = useState(false);
  const save = () => { try { key ? localStorage.setItem("xai_api_key", key) : localStorage.removeItem("xai_api_key"); setSaved(true); } catch { /* ignore */ } };
  return (
    <>
      <PageHead title="Settings" sub="Connection details and model configuration." />
      {loading ? <Loading /> : error || !data ? <ErrorBox message={error ?? "No response"} onRetry={reload} /> : (
        <div className="grid2">
          <section className="card"><h3>Backend</h3><dl className="dl">
            <div><dt>Status</dt><dd>{data.status}</dd></div><div><dt>Database</dt><dd>{data.database}</dd></div>
            <div><dt>API address</dt><dd>{API_BASE || "same origin (/api, proxied in dev)"}</dd></div><div><dt>Demo mode</dt><dd>{data.demo_mode ? "on, synthetic data" : "off"}</dd></div></dl>
            <label className="field"><span>API key (only if the server sets API_KEY)</span><input type="password" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }} /></label>
            <button className="btn" onClick={save}>Save key in this browser</button>{saved && <span className="small" role="status"> Saved.</span>}</section>
          <section className="card"><h3>Model {data.model_version}</h3><dl className="dl">
            <div><dt>Approve when risk is below</dt><dd>{pct(data.thresholds.approve_below)}</dd></div><div><dt>Reject when risk is at least</dt><dd>{pct(data.thresholds.reject_at_or_above)}</dd></div>
            <div><dt>Features</dt><dd>{data.features.join(", ")}</dd></div></dl><p className="small muted">{data.probability_meaning} Thresholds are read from the model metadata, not hardcoded in the interface. API docs are served at <code>/docs</code> on the backend.</p></section>
        </div>)}
    </>
  );
}
