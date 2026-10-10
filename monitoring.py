from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..dependencies import get_db
from ..services import predictor

router = APIRouter(prefix="/api", tags=["monitoring"])


def build_alerts(m: dict) -> list[dict]:
    day = m["trained_on"]
    alerts = []
    for d in m["drift"]:
        if d["status"] != "stable":
            alerts.append({"date": day, "severity": "high" if d["status"] == "alert" else "medium", "kind": "drift",
                           "message": f"Input drift on {d['feature']} (PSI {d['psi']:.2f}) in the simulated recent window."})
    for g, v in m["fairness"].items():
        ratio = v["disparate_impact_ratio"]
        if ratio is not None and ratio < 0.8:
            alerts.append({"date": day, "severity": "high", "kind": "fairness", "message": f"Approval-rate ratio across {g} groups is {ratio:.2f}, below 0.80."})
        elif ratio is not None and ratio < 0.9:
            alerts.append({"date": day, "severity": "medium", "kind": "fairness", "message": f"Approval-rate ratio across {g} groups is {ratio:.2f}; keep watching."})
    alerts.append({"date": day, "severity": "info", "kind": "model", "message": f"Model {m['model_version']} trained and evaluated on synthetic data."})
    return alerts


@router.get("/monitoring/summary")
def summary():
    m = predictor.meta()
    return {**{k: m[k] for k in ["model_version", "dataset", "performance", "calibration", "fairness", "drift", "class_mix", "thresholds", "limitations"]},
            "alerts": build_alerts(m)}


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    m = predictor.meta()
    counts = dict(db.query(models.Decision.predicted_class, func.count()).group_by(models.Decision.predicted_class).all())
    reviews = dict(db.query(models.Decision.review_status, func.count()).group_by(models.Decision.review_status).all())
    total = sum(counts.values())
    recent = db.query(models.Decision).order_by(models.Decision.created_at.desc()).limit(6).all()
    fair = min((v["disparate_impact_ratio"] or 1 for v in m["fairness"].values()), default=1)
    return {
        "total": total, "by_class": {k: counts.get(k, 0) for k in ["approve", "review", "reject"]}, "by_review_status": reviews,
        "model_version": m["model_version"], "roc_auc": m["performance"]["roc_auc"], "min_disparate_impact_ratio": fair,
        "alerts": build_alerts(m)[:5],
        "recent": [{"decision_id": d.id, "created_at": d.created_at.isoformat(), "predicted_class": d.predicted_class,
                    "risk_probability": d.risk_probability, "review_status": d.review_status} for d in recent],
    }
