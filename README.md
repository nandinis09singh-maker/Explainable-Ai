# Explainable AI for Lending: hackathon demo

An NBFC reviewer can open a loan decision, see why the model made it, test what would change it, check fairness and drift, and export an evidence report. **All data is synthetic and the model is a demo, not an underwriting policy.**

React + Vite + TypeScript frontend, FastAPI backend, scikit-learn + SHAP model, SQLite audit trail, ReportLab PDFs.

## Run it

Backend (Python 3.11+):
```bash
cd server
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.ml.train_model        # optional: model files are already included; this regenerates them
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs. On first start the database (`xai_demo.db`) is created and filled with 48 synthetic decisions.

Frontend (Node 18+), in a second terminal:
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173. In dev, `/api` is proxied to port 8000. For a deployed frontend, set `VITE_API_URL` to the backend address and add the frontend address to `CORS_ORIGINS` on the server.

Tests: `cd server && pytest`

## Pages
| Route | What it does |
|---|---|
| `/dashboard` | Totals, outcome mix, model alerts, recent decisions |
| `/decisions`, `/decisions/:id` | List, new prediction form, SHAP contribution chart, plain-English reasons, reviewer actions, PDF download |
| `/simulate`, `/decisions/:id/simulate` | What-If Lab: change income, debt, utilization and more; compare original and simulated results; reset |
| `/monitoring` | Approval-rate gaps by region and age band, ROC AUC, precision, recall, calibration, drift (PSI), alert history |
| `/audit` | Search by ID, filter by date, outcome and review status, expand explanation records and events, export PDF |
| `/settings` | Backend status, thresholds, optional API key |

## API
`GET /api/health` · `GET /api/decisions` · `GET /api/decisions/{id}` · `POST /api/decisions/predict` · `POST /api/decisions/{id}/simulate` · `POST /api/decisions/{id}/review` · `GET /api/monitoring/summary` · `GET /api/audit` · `GET /api/reports/{id}/pdf` · plus `GET /api/overview` for the dashboard.

Inputs are validated with Pydantic (for example `credit_utilization` must be 0 to 1). Set `API_KEY` in the server environment to require an `X-API-Key` header on write endpoints.

## How it works
- `server/app/ml/train_model.py` generates seeded synthetic data, trains a gradient-boosted tree model, and writes `model_artifact.skops` and `model_meta.json` (metrics, thresholds, fairness, calibration, drift).
- Risk probability means the estimated probability of default. Approve below 25%, reject at 50% or above, review in between. These live in `model_meta.json`; the UI reads them from the API.
- `services/explainer.py` uses SHAP `TreeExplainer`, which matches the tree model. Contributions are in log-odds; positive pushes risk up.
- The model file uses `skops`. Only load artifacts you created and trust; pickle-style files can run arbitrary code when loaded.
- Fairness compares approval rates across synthetic groups that are not model inputs. The drift check compares a simulated recent window with the training data. Both are demonstrations.

## Demo script (3 minutes)
1. Dashboard: point out the alerts. 2. Open a "Needs review" decision and read the SHAP chart and reasons. 3. What-If Lab: lower credit utilization and watch the outcome flip. 4. Save a reviewer action. 5. Download the PDF. 6. Audit page: find the decision and show its event trail. 7. Monitoring: fairness ratio, calibration, drift alerts, and the limitations list.
