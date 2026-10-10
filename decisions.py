from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_db, require_write_access
from ..services import audit, explainer, predictor

router = APIRouter(prefix="/api/decisions", tags=["decisions"])


def to_out(d: models.Decision) -> schemas.DecisionOut:
    return schemas.DecisionOut(
        decision_id=d.id, created_at=d.created_at, model_version=d.model_version, applicant_label=d.applicant_label,
        region=d.region, age_band=d.age_band, inputs=d.inputs, predicted_class=d.predicted_class,
        risk_probability=d.risk_probability, base_value=d.base_value, explanations=d.explanations, reasons=d.reasons,
        review_status=d.review_status, thresholds=predictor.meta()["thresholds"],
        events=[schemas.AuditEventOut.model_validate(e) for e in d.events],
    )


def get_or_404(db: Session, decision_id: str) -> models.Decision:
    d = db.get(models.Decision, decision_id)
    if not d:
        raise HTTPException(404, f"Decision {decision_id} not found")
    return d


def day_start(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def filtered(db: Session, q: Optional[str], predicted_class: Optional[str], review_status: Optional[str],
             date_from: Optional[date], date_to: Optional[date]):
    query = db.query(models.Decision)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(models.Decision.id.ilike(like), models.Decision.applicant_label.ilike(like)))
    if predicted_class:
        query = query.filter(models.Decision.predicted_class == predicted_class)
    if review_status:
        query = query.filter(models.Decision.review_status == review_status)
    if date_from:
        query = query.filter(models.Decision.created_at >= day_start(date_from))
    if date_to:
        query = query.filter(models.Decision.created_at < day_start(date_to) + timedelta(days=1))
    return query.order_by(models.Decision.created_at.desc())


@router.get("", response_model=list[schemas.DecisionSummary])
def list_decisions(q: Optional[str] = None, predicted_class: Optional[str] = Query(default=None, pattern="^(approve|review|reject)$"),
                   review_status: Optional[str] = None, date_from: Optional[date] = None, date_to: Optional[date] = None,
                   limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    return filtered(db, q, predicted_class, review_status, date_from, date_to).limit(limit).all()


@router.post("/predict", response_model=schemas.DecisionOut, status_code=201, dependencies=[Depends(require_write_access)])
def predict_new(body: schemas.PredictRequest, db: Session = Depends(get_db)):
    inputs = body.model_dump(include=set(predictor.features()))
    p, cls = predictor.predict(inputs)
    items, base = explainer.explain(inputs)
    d = models.Decision(
        id=audit.next_decision_id(db), model_version=predictor.meta()["model_version"], applicant_label=body.applicant_label,
        region=body.region, age_band=body.age_band, inputs=inputs, predicted_class=cls, risk_probability=round(p, 4),
        base_value=base, explanations=items, reasons=explainer.reasons(items, cls, p),
    )
    db.add(d)
    db.flush()
    audit.record(db, d.id, "api", "prediction_created", f"{d.model_version} predicted '{cls}' at risk {p:.2f}")
    db.commit()
    db.refresh(d)
    return to_out(d)


@router.get("/{decision_id}", response_model=schemas.DecisionOut)
def get_decision(decision_id: str, db: Session = Depends(get_db)):
    return to_out(get_or_404(db, decision_id))


@router.post("/{decision_id}/review", response_model=schemas.DecisionOut, dependencies=[Depends(require_write_access)])
def review(decision_id: str, body: schemas.ReviewRequest, db: Session = Depends(get_db)):
    d = get_or_404(db, decision_id)
    if body.action != "note":
        d.review_status = body.action
    audit.record(db, d.id, body.reviewer, f"review_{body.action}", body.notes)
    db.commit()
    db.refresh(d)
    return to_out(d)
