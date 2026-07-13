from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SampleStatus = Literal["ready", "processing", "attention", "archived"]
ActionKind = Literal["validate", "simulate"]
ActionStatus = Literal["succeeded", "failed"]


class FieldError(BaseModel):
    field: str
    message: str


class ErrorEnvelope(BaseModel):
    code: str
    message: str
    retryable: bool = False
    request_id: str
    fields: list[FieldError] = Field(default_factory=list)


class HealthMeta(BaseModel):
    app_name: str
    version: str
    generated_at: datetime
    features: list[str]


class SampleMetrics(BaseModel):
    executions: int
    success_rate: float = Field(ge=0, le=1)
    median_duration_ms: int = Field(ge=0)


class SampleSummary(BaseModel):
    id: str
    title: str
    subtitle: str | None = None
    status: SampleStatus
    tags: list[str]
    updated_at: datetime
    owner: str
    score: float
    missing_fields: list[str] = Field(default_factory=list)


class SampleDetail(SampleSummary):
    description: str
    code: str
    traceback: str | None = None
    metrics: SampleMetrics
    attributes: dict[str, str | int | float | None]


class SampleListResponse(BaseModel):
    items: list[SampleSummary]
    total: int
    partial: bool = False
    missing_sources: list[str] = Field(default_factory=list)


class ActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: ActionKind = "validate"
    force_failure: bool = False


class ActionResponse(BaseModel):
    item_id: str
    action: ActionKind
    status: ActionStatus
    message: str
    result: dict[str, str | int | float]
    completed_at: datetime
