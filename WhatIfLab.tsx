import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getDecision, listDecisions, simulate } from "../api/decisions";
import { errorMessage } from "../api/client";
import WhatIfComparison from "../components/explainability/WhatIfComparison";
import { ErrorBox, Loading, PageHead } from "../components/ui";
import { useAsync, useDebounced } from "../hooks";
import { inr, pct } from "../format";
import type { Inputs, SimResult } from "../types";

const CONTROLS: { k: keyof Inputs; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { k: "annual_income", label: "Annual income", min: 150000, max: 3000000, step: 10000, fmt: inr },
  { k: "existing_monthly_debt", label: "Existing monthly debt", min: 0, max: 150000, step: 500, fmt: inr },
  { k: "credit_utilization", label: "Credit utilization", min: 0, max: 1, step: 0.01, fmt: (v) => pct(v) },
  { k: "loan_amount", label: "Loan amount", min: 25000, max: 1500000, step: 5000, fmt: inr },
  { k: "repayment_history_score", label: "Repayment history score", min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
];

function Lab({ id }: { id: string }) {
  const { data: base, error, loading, reload } = useAsync(() => getDecision(id), [id]);
  const [vals, setVals] = useState<Inputs | null>(null);
  const [res, setRes] = useState<SimResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (base) { setVals(base.inputs); setRes(null); } }, [base]);
  const debounced = useDebounced(vals, 350);
  const changed = useMemo(() => (base && vals ? CONTROLS.some((c) => vals[c.k] !== base.inputs[c.k]) : false), [base, vals]);

  useEffect(() => {
    if (!base || !debounced) return;
    let live = true;
    simulate(id, debounced).then((r) => { if (live) { setRes(r); setErr(null); } }).catch((e) => live && setErr(errorMessage(e)));
    return () => { live = false; };
  }, [id, base, debounced]);

  if (loading) return <Loading />;
  if (error || !base || !vals) return <ErrorBox message={error ?? "Not found"} onRetry={reload} />;
  return (
    <>
      <PageHead title="What-If Lab" sub={`Change inputs for ${id} and compare the new prediction with the original. Nothing is saved.`}
        actions={<><Link className="btn" to={`/decisions/${id}`}>Back to decision</Link><button className="btn" disabled={!changed} onClick={() => setVals(base.inputs)}>Reset to original</button></>} />
      <div className="lab">
        <section className="card controls"><h3>Inputs</h3>
          {CONTROLS.map((c) => (
            <div className="field" key={c.k}>
              <label htmlFor={c.k}><span>{c.label}</span><output>{c.fmt(vals[c.k])}{vals[c.k] !== base.inputs[c.k] && <em> (was {c.fmt(base.inputs[c.k])})</em>}</output></label>
              <input id={c.k} type="range" min={c.min} max={Math.max(c.max, base.inputs[c.k])} step={c.step} value={vals[c.k]}
                onChange={(e) => setVals({ ...vals, [c.k]: Number(e.target.value) })} />
            </div>))}
          <p className="muted small">Simulation only. Results come from a demo model trained on synthetic data and are not a lending recommendation.</p>
        </section>
        <div>{err && <ErrorBox message={err} />}{!res ? <Loading label="Simulating" /> : <WhatIfComparison result={res} thresholds={base.thresholds} />}</div>
      </div>
    </>
  );
}

function Picker() {
  const { data, error, loading, reload } = useAsync(() => listDecisions({}), []);
  if (loading) return <Loading />;
  if (error || !data?.length) return <ErrorBox message={error ?? "No decisions to simulate yet."} onRetry={reload} />;
  return <Navigate to={`/decisions/${data[0].decision_id}/simulate`} replace />;
}

export default function WhatIfLab() {
  const { id } = useParams();
  return id ? <Lab id={id} key={id} /> : <Picker />;
}
