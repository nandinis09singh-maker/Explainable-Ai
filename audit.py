from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_db
from .decisions import filtered, get_or_404

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def audit_records(q: Optional[str] = None, review_status: Optional[str] = None, predicted_class: Optional[str] = None,
                  date_from: Optional[date] = None, date_to: Optional[date] = None,
                  limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    rows = filtered(db, q, predicted_class, review_status, date_from, date_to).limit(limit).all()
    return [{
        "decision_id": d.id, "created_at": d.created_at, "model_version": d.model_version, "predicted_class": d.predicted_class,
        "risk_probability": d.risk_probability, "review_status": d.review_status, "event_count": len(d.events),
        "top_factor": d.explanations[0]["label"] if d.explanations else None, "explanations": d.explanations, "reasons": d.reasons,
        "events": [schemas.AuditEventOut.model_validate(e) for e in d.events],
    } for d in rows]


@router.get("/{decision_id}/events", response_model=list[schemas.AuditEventOut])
def events(decision_id: str, db: Session = Depends(get_db)):
    return get_or_404(db, decision_id).events
