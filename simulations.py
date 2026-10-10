from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_db
from ..services import explainer, predictor
from .decisions import get_or_404

router = APIRouter(prefix="/api/decisions", tags=["simulation"])

DISCLAIMER = ("Simulation only. Nothing is saved or sent to a borrower. Results come from a demo model trained on "
              "synthetic data and are not a lending recommendation.")


@router.post("/{decision_id}/simulate", response_model=schemas.SimulateOut)
def simulate(decision_id: str, body: schemas.SimulateRequest, db: Session = Depends(get_db)):
    d = get_or_404(db, decision_id)
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    new_inputs = {**d.inputs, **changes}
    p0, c0 = d.risk_probability, d.predicted_class
    p1, c1 = predictor.predict(new_inputs)
    items1, _ = explainer.explain(new_inputs)
    before = {e["feature"]: e["contribution"] for e in d.explanations}
    after = {e["feature"]: e["contribution"] for e in items1}
    labels = explainer.LABELS
    factor_changes = sorted(
        [schemas.FactorChange(feature=f, label=labels[f], original_contribution=before[f], simulated_contribution=after[f],
                              change=round(after[f] - before[f], 4)) for f in before],
        key=lambda x: abs(x.change), reverse=True)
    top = next((f for f in factor_changes if abs(f.change) > 0.005), None)
    delta = p1 - p0
    summary = (f"Estimated risk moves from {p0 * 100:.0f}% to {p1 * 100:.0f}% ({'+' if delta >= 0 else ''}{delta * 100:.1f} points); "
               + (f"the outcome changes from '{c0}' to '{c1}'. " if c0 != c1 else f"the outcome stays '{c1}'. ")
               + (f"The biggest shift comes from {top.label.lower()}." if top else "No factor moved noticeably."))
    return schemas.SimulateOut(
        decision_id=d.id,
        original=schemas.SimulationSide(inputs=d.inputs, predicted_class=c0, risk_probability=p0, explanations=d.explanations),
        simulated=schemas.SimulationSide(inputs=new_inputs, predicted_class=c1, risk_probability=round(p1, 4), explanations=items1),
        risk_change=round(delta, 4), class_changed=c0 != c1, factor_changes=factor_changes, summary=summary, disclaimer=DISCLAIMER)
