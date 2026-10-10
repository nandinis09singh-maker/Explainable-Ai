import os, tempfile
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/t.db"
from fastapi.testclient import TestClient
from app.main import app

BODY = {"annual_income": 600000, "loan_amount": 150000, "existing_monthly_debt": 8000, "credit_utilization": 0.35, "repayment_history_score": 0.9}


def test_flow():
    with TestClient(app) as c:
        assert c.get("/api/health").json()["status"] == "ok"
        lst = c.get("/api/decisions").json()
        assert len(lst) == 48
        r = c.post("/api/decisions/predict", json=BODY)
        assert r.status_code == 201
        d = r.json()
        assert d["predicted_class"] in ("approve", "review", "reject") and len(d["explanations"]) == 5
        # contributions sum to the model output in log-odds
        import math
        logit = d["base_value"] + sum(e["contribution"] for e in d["explanations"])
        assert abs(1 / (1 + math.exp(-logit)) - d["risk_probability"]) < 0.01
        did = d["decision_id"]
        s = c.post(f"/api/decisions/{did}/simulate", json={"existing_monthly_debt": 40000, "credit_utilization": 0.9}).json()
        assert s["simulated"]["risk_probability"] > s["original"]["risk_probability"]
        rv = c.post(f"/api/decisions/{did}/review", json={"reviewer": "qa", "action": "escalate", "notes": "check"}).json()
        assert rv["review_status"] == "escalate" and len(rv["events"]) == 2
        pdf = c.get(f"/api/reports/{did}/pdf")
        assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
        assert c.get("/api/audit", params={"q": did}).json()[0]["decision_id"] == did
        assert c.get("/api/monitoring/summary").json()["performance"]["roc_auc"] > 0.6
        assert c.get("/api/overview").json()["total"] == 49
        assert c.post("/api/decisions/predict", json={**BODY, "credit_utilization": 2}).status_code == 422
        assert c.get("/api/decisions/NOPE").status_code == 404
