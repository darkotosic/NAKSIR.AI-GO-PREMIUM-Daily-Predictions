import enum


class AuthProvider(str, enum.Enum):
    device = "device"
    email_otp = "email_otp"
    google = "google"


class Platform(str, enum.Enum):
    android = "android"


class PurchaseState(str, enum.Enum):
    purchased = "purchased"
    pending = "pending"


class PurchaseStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    canceled = "canceled"
    refunded = "refunded"


class EntitlementStatus(str, enum.Enum):
    active = "active"
    expired = "expired"


class CoinLedgerType(str, enum.Enum):
    earn = "earn"
    spend = "spend"
    purchase = "purchase"
    adjust = "adjust"


class CoinLedgerSource(str, enum.Enum):
    rewarded_ad = "rewarded_ad"
    iap = "iap"
    ai_analysis = "ai_analysis"
    predictions = "predictions"
    admin = "admin"


class ConsentStatus(str, enum.Enum):
    unknown = "unknown"
    consented = "consented"
    declined = "declined"


class ProductType(str, enum.Enum):
    subscription = "subscription"
    consumable = "consumable"
