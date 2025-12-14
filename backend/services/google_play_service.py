from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional, Tuple

from backend.config import settings


class GooglePlayVerifyError(RuntimeError):
    pass


def _require_service_account_json() -> dict[str, Any]:
    raw = settings.google_play_service_account_json
    if not raw:
        raise GooglePlayVerifyError("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured")
    try:
        return json.loads(raw)
    except Exception as exc:  # noqa: BLE001
        raise GooglePlayVerifyError("Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") from exc


def _build_androidpublisher():
    """
    Lazy import to avoid hard dependency during tests.
    Requires:
      google-auth
      google-api-python-client
    """
    try:
        from google.oauth2.service_account import Credentials  # type: ignore
        from googleapiclient.discovery import build  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise GooglePlayVerifyError(
            "Missing dependencies for Google Play verify. Install: google-auth, google-api-python-client"
        ) from exc

    info = _require_service_account_json()
    creds = Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/androidpublisher"]
    )
    return build("androidpublisher", "v3", credentials=creds, cache_discovery=False)


def _millis_to_dt(ms: Optional[str | int]) -> Optional[datetime]:
    if ms is None:
        return None
    try:
        ms_int = int(ms)
        return datetime.fromtimestamp(ms_int / 1000.0, tz=timezone.utc).replace(tzinfo=None)
    except Exception:
        return None


def fetch_subscription_state(
    *, package_name: str, subscription_id: str, purchase_token: str
) -> dict[str, Any]:
    """
    Tries SubscriptionsV2 first (modern). Falls back to legacy subscriptions.get.
    Returns a normalized dict with:
      - order_id
      - acknowledged (bool or None)
      - start_at (datetime|None)
      - end_at (datetime|None)
      - raw (dict)
    """
    svc = _build_androidpublisher()

    # 1) SubscriptionsV2 (best effort)
    try:
        res_v2 = (
            svc.purchases()
            .subscriptionsv2()
            .get(packageName=package_name, token=purchase_token)
            .execute()
        )
        # v2 has "lineItems": [{ "productId": "...", "expiryTime": "...", ... }]
        line_items = res_v2.get("lineItems") or []
        end_at = None
        if line_items:
            # pick the line item matching subscription_id when possible
            match = None
            for li in line_items:
                if li.get("productId") == subscription_id:
                    match = li
                    break
            li = match or line_items[0]
            end_at = _millis_to_dt(li.get("expiryTime")) or _millis_to_dt(li.get("expiryTimeMillis"))
        order_id = res_v2.get("latestOrderId") or res_v2.get("orderId")
        # v2 ack status is not always present; keep None if missing
        acknowledged = res_v2.get("acknowledgementState")
        if isinstance(acknowledged, str):
            acknowledged = acknowledged.lower() in {"acknowledged", "acknowledged_state", "acknowledgedstate"}
        elif isinstance(acknowledged, bool):
            pass
        else:
            acknowledged = None

        start_at = None  # v2 doesn't consistently expose start time

        return {
            "order_id": order_id,
            "acknowledged": acknowledged,
            "start_at": start_at,
            "end_at": end_at,
            "raw": res_v2,
            "api": "subscriptionsv2.get",
        }
    except Exception:
        pass

    # 2) Legacy subscriptions.get
    res = (
        svc.purchases()
        .subscriptions()
        .get(packageName=package_name, subscriptionId=subscription_id, token=purchase_token)
        .execute()
    )

    order_id = res.get("orderId")
    acknowledged = res.get("acknowledgementState")
    if isinstance(acknowledged, int):
        # 0 = not acknowledged, 1 = acknowledged
        acknowledged = acknowledged == 1
    elif isinstance(acknowledged, bool):
        pass
    else:
        acknowledged = None

    start_at = _millis_to_dt(res.get("startTimeMillis"))
    end_at = _millis_to_dt(res.get("expiryTimeMillis"))

    return {
        "order_id": order_id,
        "acknowledged": acknowledged,
        "start_at": start_at,
        "end_at": end_at,
        "raw": res,
        "api": "subscriptions.get",
    }
