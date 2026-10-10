"""Train the demo credit-risk model on SYNTHETIC data and write evaluation metadata.

Run:  python -m app.ml.train_model
Outputs (in this folder): model_artifact.skops, model_meta.json
The data is generated here with a fixed seed, so results are reproducible.
Nothing here is a recommended underwriting policy.
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import skops.io as sio
from sklearn.calibration import calibration_curve
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, brier_score_loss, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

HERE = Path(__file__).parent
ARTIFACT = HERE / "model_artifact.skops"
META = HERE / "model_meta.json"

MODEL_VERSION = "demo-v1"
SEED = 42
FEATURES = ["annual_income", "loan_amount", "existing_monthly_debt", "credit_utilization", "repayment_history_score"]

# Risk probability = estimated probability of default (label 1 = defaulted).
# Class thresholds are defined here, saved in model_meta.json, and read by the API.
THRESHOLDS = {"approve_below": 0.25, "reject_at_or_above": 0.50}

GROUPS = {
    "region": ["North", "South", "East", "West"],
    "age_band": ["18-30", "31-45", "46+"],
}


def generate(n: int, rng: np.random.Generator, income_shift: float = 0.0, util_shift: float = 0.0) -> pd.DataFrame:
    income = np.clip(rng.lognormal(mean=13.15 + income_shift, sigma=0.45, size=n), 150_000, 3_000_000)
    loan = np.clip(income * rng.uniform(0.1, 0.9, n), 25_000, 1_500_000)
    debt = np.clip(income / 12 * rng.beta(2, 6, n) * 1.2, 0, None)
    util = np.clip(rng.beta(2.2, 3.5, n) + util_shift, 0, 1)
    repay = np.clip(rng.beta(5, 1.8, n), 0, 1)
    df = pd.DataFrame({
        "annual_income": income.round(0),
        "loan_amount": loan.round(0),
        "existing_monthly_debt": debt.round(0),
        "credit_utilization": util.round(3),
        "repayment_history_score": repay.round(3),
    })
    df["region"] = rng.choice(GROUPS["region"], n)
    df["age_band"] = rng.choice(GROUPS["age_band"], n, p=[0.3, 0.45, 0.25])
    return df


def true_risk(df: pd.DataFrame) -> np.ndarray:
    dti = df["existing_monthly_debt"] * 12 / df["annual_income"]
    lti = df["loan_amount"] / df["annual_income"]
    z = -4.5 + 1.4 * (3.0 * dti + 1.4 * lti + 2.2 * df["credit_utilization"] - 3.6 * (df["repayment_history_score"] - 0.7))
    return 1 / (1 + np.exp(-z))


def label(df: pd.DataFrame, rng: np.random.Generator) -> np.ndarray:
    return (rng.random(len(df)) < true_risk(df)).astype(int)


def psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    edges = np.quantile(expected, np.linspace(0, 1, bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e, a = np.clip(e, 1e-4, None), np.clip(a, 1e-4, None)
    return float(np.sum((a - e) * np.log(a / e)))


def classify(p: np.ndarray) -> np.ndarray:
    return np.where(p < THRESHOLDS["approve_below"], "approve", np.where(p >= THRESHOLDS["reject_at_or_above"], "reject", "review"))


def main() -> None:
    rng = np.random.default_rng(SEED)
    data = generate(6000, rng)
    data["default"] = label(data, rng)
    train, test = train_test_split(data, test_size=0.3, random_state=SEED, stratify=data["default"])

    model = GradientBoostingClassifier(n_estimators=120, max_depth=3, learning_rate=0.08, subsample=0.8, random_state=SEED)
    model.fit(train[FEATURES], train["default"])

    proba = model.predict_proba(test[FEATURES])[:, 1]
    cls = classify(proba)
    y = test["default"].to_numpy()
    flagged = (proba >= THRESHOLDS["approve_below"]).astype(int)  # risky = review or reject

    frac_pos, mean_pred = calibration_curve(y, proba, n_bins=8, strategy="quantile")
    test = test.assign(risk=proba, cls=cls)

    fairness = {}
    for g, values in GROUPS.items():
        rows = []
        for v in values:
            m = test[g] == v
            rows.append({
                "group": v,
                "n": int(m.sum()),
                "approval_rate": round(float((test.loc[m, "cls"] == "approve").mean()), 4),
                "mean_risk": round(float(test.loc[m, "risk"].mean()), 4),
            })
        rates = [r["approval_rate"] for r in rows]
        fairness[g] = {
            "groups": rows,
            "max_gap": round(max(rates) - min(rates), 4),
            "disparate_impact_ratio": round(min(rates) / max(rates), 4) if max(rates) else None,
        }

    # Drift: compare a SIMULATED recent window (incomes slightly lower, utilisation higher) with training data.
    recent = generate(1500, np.random.default_rng(SEED + 1), income_shift=-0.25, util_shift=0.10)
    drift = []
    for f in FEATURES:
        v = psi(train[f].to_numpy(), recent[f].to_numpy())
        drift.append({"feature": f, "psi": round(v, 4), "status": "alert" if v >= 0.25 else "watch" if v >= 0.10 else "stable"})

    today = date.today().isoformat()
    meta = {
        "model_version": MODEL_VERSION,
        "trained_on": today,
        "features": FEATURES,
        "thresholds": THRESHOLDS,
        "probability_meaning": "Estimated probability of default on the synthetic training distribution.",
        "dataset": {
            "name": "Synthetic lending data (generated, seed %d)" % SEED,
            "train_rows": int(len(train)), "eval_rows": int(len(test)),
            "evaluation_period": "Synthetic hold-out set, generated %s" % today,
            "drift_window": "Simulated recent window (1,500 rows) with shifted income and utilisation",
        },
        "performance": {
            "roc_auc": round(float(roc_auc_score(y, proba)), 4),
            "accuracy_at_review_cutoff": round(float(accuracy_score(y, flagged)), 4),
            "precision_at_review_cutoff": round(float(precision_score(y, flagged)), 4),
            "recall_at_review_cutoff": round(float(recall_score(y, flagged)), 4),
            "brier_score": round(float(brier_score_loss(y, proba)), 4),
            "default_rate": round(float(y.mean()), 4),
        },
        "calibration": [{"predicted": round(float(a), 4), "observed": round(float(b), 4)} for a, b in zip(mean_pred, frac_pos)],
        "class_mix": {k: int((cls == k).sum()) for k in ["approve", "review", "reject"]},
        "fairness": fairness,
        "drift": drift,
        "reference": {f: {"mean": round(float(train[f].mean()), 4), "std": round(float(train[f].std()), 4)} for f in FEATURES},
        "limitations": [
            "Trained on synthetic data only; the numbers do not describe any real lender or population.",
            "Group attributes (region, age band) are synthetic and are not model inputs; fairness checks compare outcomes only.",
            "Feature contributions are SHAP values in log-odds units for a tree model; they describe the model, not causal effects.",
            "Thresholds are demonstration values, not a recommended underwriting policy.",
        ],
    }

    sio.dump(model, ARTIFACT)
    META.write_text(json.dumps(meta, indent=2))

    # Demo applicants for seeding the database: sampled from the hold-out set.
    demo = test.sample(48, random_state=SEED)[FEATURES + ["region", "age_band"]].reset_index(drop=True)
    demo.to_csv(HERE / "demo_applicants.csv", index=False)
    print("Saved", ARTIFACT.name, META.name, "| AUC", meta["performance"]["roc_auc"], "| mix", meta["class_mix"])


if __name__ == "__main__":
    main()
