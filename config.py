"""Settings. Override with environment variables (see .env.example)."""
import json
import os
from pathlib import Path

BASE = Path(__file__).resolve().parent
ML_DIR = BASE / "ml"
ARTIFACT_PATH = ML_DIR / "model_artifact.skops"
REPORT_PATH = ML_DIR / "eval_report.json"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE.parent / 'demo.db'}")
# If API_KEY is set, every /api route except /api/health requires the X-API-Key header.
API_KEY = os.getenv("API_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
CLIENT_DIST = BASE.parent.parent / "client" / "dist"


def load_report() -> dict:
    if not REPORT_PATH.exists():
        raise RuntimeError("eval_report.json not found. Run: python -m app.ml.train_model")
    return json.loads(REPORT_PATH.read_text())
