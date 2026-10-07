from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse,
    UserUpdateRoleRequest
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])

# ==========================================
# Authentication Dependencies
# ==========================================

async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to validate cryptographic access token and return active User.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:].strip()
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired or tampered access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact academic administrator.",
        )
    
    return user

async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency enforcing Administrator role privileges.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource.",
        )
    return current_user


# ==========================================
# Authentication Endpoints
# ==========================================

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new faculty or admin user with unique email & username.
    """
    email_clean = req.email.strip().lower()
    username_clean = req.username.strip().lower()

    existing_email = db.query(User).filter(User.email == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' already exists."
        )

    existing_username = db.query(User).filter(User.username == username_clean).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{username_clean}' is already taken."
        )

    hashed_pw = hash_password(req.password)
    user = User(
        email=email_clean,
        username=username_clean,
        hashed_password=hashed_pw,
        full_name=req.full_name.strip(),
        role=req.role,
        department=req.department.strip() if req.department else None,
        is_active=1,
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name
    })

    return AuthResponse(
        access_token=token,
        token_type="Bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
            is_active=bool(user.is_active),
            created_at=user.created_at
        )
    )


@router.post("/login", response_model=AuthResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user via email/username and password.
    """
    identifier = req.username_or_email.strip().lower()

    user = db.query(User).filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact your administrator."
        )

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name
    })

    return AuthResponse(
        access_token=token,
        token_type="Bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
            is_active=bool(user.is_active),
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns profile information for the authenticated user.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_active=bool(current_user.is_active),
        created_at=current_user.created_at
    )


@router.get("/users", response_model=List[UserResponse])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin only: Lists all registered institutional users.
    """
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            role=u.role,
            department=u.department,
            is_active=bool(u.is_active),
            created_at=u.created_at
        )
        for u in users
    ]


@router.put("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    req: UserUpdateRoleRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin only: Updates user role (ADMIN/FACULTY) or activates/deactivates user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    # Protect against self-deactivation or revoking own admin rights
    if user.id == admin.id and req.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account."
        )

    if req.role is not None:
        user.role = req.role

    if req.is_active is not None:
        user.is_active = 1 if req.is_active else 0

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        is_active=bool(user.is_active),
        created_at=user.created_at
    )
