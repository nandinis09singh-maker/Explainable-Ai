from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApplicantInput(BaseModel):
    annual_income: float = Field(gt=0, le=100_000_000)
    loan_amount: float = Field(gt=0, le=100_000_000)
    existing_monthly_debt: float = Field(ge=0, le=10_000_000)
    credit_utilization: float = Field(ge=0, le=1)
    repayment_history_score: float = Field(ge=0, le=1)


class PredictRequest(ApplicantInput):
    applicant_label: str = Field(default="Synthetic applicant", max_length=80)
    region: str = Field(default="", max_length=20)
    age_band: str = Field(default="", max_length=20)


class Explanation(BaseModel):
    feature: str
    label: str
    value: float
    contribution: float
    direction: Literal["increases_risk", "reduces_risk", "neutral"]


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    decision_id: str
    ts: datetime
    actor: str
    action: str
    detail: str


class DecisionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    decision_id: str = Field(validation_alias="id")
    created_at: datetime
    model_version: str
    applicant_label: str
    predicted_class: str
    risk_probability: float
    review_status: str


class DecisionOut(BaseModel):
    decision_id: str
    created_at: datetime
    model_version: str
    applicant_label: str
    region: str
    age_band: str
    inputs: ApplicantInput
    predicted_class: str
    risk_probability: float
    base_value: float
    explanations: list[Explanation]
    reasons: list[str]
    review_status: str
    thresholds: dict
    events: list[AuditEventOut] = []
    demo_mode: bool = True


class SimulateRequest(BaseModel):
    """Only fields you want to change; anything omitted keeps the original value."""
    annual_income: Optional[float] = Field(default=None, gt=0, le=100_000_000)
    loan_amount: Optional[float] = Field(default=None, gt=0, le=100_000_000)
    existing_monthly_debt: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    credit_utilization: Optional[float] = Field(default=None, ge=0, le=1)
    repayment_history_score: Optional[float] = Field(default=None, ge=0, le=1)


class SimulationSide(BaseModel):
    inputs: ApplicantInput
    predicted_class: str
    risk_probability: float
    explanations: list[Explanation]


class FactorChange(BaseModel):
    feature: str
    label: str
    original_contribution: float
    simulated_contribution: float
    change: float


class SimulateOut(BaseModel):
    decision_id: str
    original: SimulationSide
    simulated: SimulationSide
    risk_change: float
    class_changed: bool
    factor_changes: list[FactorChange]
    summary: str
    disclaimer: str


class ReviewRequest(BaseModel):
    reviewer: str = Field(min_length=1, max_length=60)
    action: Literal["approve", "reject", "escalate", "note"]
    notes: str = Field(default="", max_length=1000)
