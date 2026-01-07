from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class RootResponse(BaseModel):
    service: str
    status: str
    docs: str
    redoc: str
    timezone: str


class HealthResponse(BaseModel):
    status: str
    db: Optional[str] = None


class RouteDescriptor(BaseModel):
    path: str
    methods: List[str]
    name: Optional[str] = None
