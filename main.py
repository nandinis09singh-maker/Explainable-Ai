import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import models  # noqa: F401  (registers tables)
from .database import Base, SessionLocal, engine
from .routers import audit, decisions, monitoring, reports, simulations
from .services import predictor, seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed.seed(db)
    yield


app = FastAPI(title="Explainable AI for Lending (demo)", version="1.0.0", lifespan=lifespan,
              description="Synthetic-data demo of explainable, auditable loan decisions. Not a lending recommendation.")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
                   allow_methods=["*"], allow_headers=["*"])
for r in (decisions.router, simulations.router, monitoring.router, audit.router, reports.router):
    app.include_router(r)


@app.get("/api/health", tags=["health"])
def health():
    with engine.connect() as c:
        c.execute(text("select 1"))
    m = predictor.meta()
    return {"status": "ok", "model_version": m["model_version"], "thresholds": m["thresholds"], "database": "ok", "demo_mode": True,
            "features": m["features"], "probability_meaning": m["probability_meaning"]}
