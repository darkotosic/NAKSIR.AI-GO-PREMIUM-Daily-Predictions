"""Router template (copy/paste for new routes).

Do NOT include this router in main.py.
It exists as a reference to keep new routers consistent.
"""

from fastapi import APIRouter

from backend.deps import CtxDep

router = APIRouter(prefix="/example", tags=["example"])


@router.get("/ping")
def ping(ctx: CtxDep):
    # ctx.app_id defaults if X-App-Id missing
    return {"ok": True, "app_id": ctx.app_id}
