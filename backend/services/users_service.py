from __future__ import annotations

from sqlalchemy.orm import Session

from backend.models import CoinsWallet, User
from backend.models.enums import AuthProvider


def get_or_create_user(session: Session, install_id: str) -> tuple[User, CoinsWallet]:
    user = session.query(User).filter(User.device_id == install_id).one_or_none()
    if user is None:
        user = User(device_id=install_id, auth_provider=AuthProvider.device)
        session.add(user)
        session.flush()

    wallet = session.query(CoinsWallet).filter(CoinsWallet.user_id == user.id).one_or_none()
    if wallet is None:
        wallet = CoinsWallet(user_id=user.id, balance=0, free_reward_used=False)
        session.add(wallet)

    return user, wallet


def mark_free_reward_used(session: Session, wallet: CoinsWallet) -> CoinsWallet:
    wallet.free_reward_used = True
    session.add(wallet)
    session.commit()
    return wallet
