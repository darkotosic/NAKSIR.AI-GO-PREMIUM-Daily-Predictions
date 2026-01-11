"""Shared FastAPI dependencies (short aliases).

Goal:
- Make AppContext dependency usage consistent across new routers/services.
- Keep existing routers unchanged (no regressions).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from backend.apps.models import AppContext
from backend.dependencies import require_app_context

# Standard alias for request-scoped context
CtxDep = Annotated[AppContext, Depends(require_app_context)]
