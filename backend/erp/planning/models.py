"""Planning ERP Models"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PlanningItem(BaseModel):
    id: str
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
