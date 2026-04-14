from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HostelCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=200)
    blocks: int = Field(default=1, ge=1, le=200)
    floors: int = Field(default=1, ge=1, le=200)


class HostelResponse(BaseModel):
    id: str
    name: str
    location: str
    blocks: int
    floors: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentCountCreate(BaseModel):
    student_count: int = Field(ge=1, le=100000)
    effective_date: datetime = Field(default_factory=utc_now)


class StudentCountResponse(BaseModel):
    id: str
    hostel_id: str
    student_count: int
    effective_date: datetime
    created_at: datetime


class ConsumptionCreate(BaseModel):
    timestamp: datetime = Field(default_factory=utc_now)
    bath_l: float = Field(ge=0)
    laundry_l: float = Field(ge=0)
    drinking_l: float = Field(ge=0)
    kitchen_l: float = Field(ge=0)
    other_l: float = Field(default=0, ge=0)

    @field_validator("bath_l", "laundry_l", "drinking_l", "kitchen_l", "other_l")
    @classmethod
    def round_values(cls, value: float) -> float:
        return round(value, 3)


class ConsumptionResponse(BaseModel):
    id: str
    hostel_id: str
    timestamp: datetime
    bath_l: float
    laundry_l: float
    drinking_l: float
    kitchen_l: float
    other_l: float
    total_l: float
    created_at: datetime


class CalculationResultResponse(BaseModel):
    id: str
    hostel_id: str
    total_l: float
    per_student_l: float
    category_split_pct: dict[str, float]
    reuse_potential_l: float
    efficiency_score: float
    computed_at: datetime


class DashboardSummaryResponse(BaseModel):
    hostel_id: str
    total_consumption_l: float
    per_student_l: float
    reuse_potential_l: float
    efficiency_score: float
    category_split_pct: dict[str, float]
    last_updated_at: datetime | None = None

