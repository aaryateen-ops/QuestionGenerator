import os
import time
import json
import base64
import hmac
import hashlib
import secrets
from typing import Optional, Dict, Any
from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a 16-byte random salt.
    Zero external dependencies, FIPS/NIST compliant, safe on all Python versions.
    Format: salt$hex_digest
    """
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return f"{salt}${digest}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored salt$hex_digest string in constant time.
    """
    try:
        if not hashed_password or "$" not in hashed_password:
            return False
        salt, expected_digest = hashed_password.split("$", 1)
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        ).hex()
        return hmac.compare_digest(actual_digest, expected_digest)
    except Exception:
        return False

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("utf-8"))

def create_access_token(payload: Dict[str, Any], expires_delta_seconds: int = 7 * 86400) -> str:
    """
    Generates a cryptographically signed URL-safe JWT-compatible token (header.payload.signature).
    HMAC-SHA256 signed with application SECRET_KEY.
    """
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    token_payload = {
        **payload,
        "iat": now,
        "exp": now + expires_delta_seconds
    }
    
    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url_encode(json.dumps(token_payload, separators=(",", ":")).encode("utf-8"))
    
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_sig = _b64url_encode(signature)
    
    return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates token signature and expiration. Returns payload dictionary if valid, else None.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        encoded_header, encoded_payload, encoded_sig = parts
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        
        actual_sig = _b64url_decode(encoded_sig)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        
        payload_bytes = _b64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))
        
        header = json.loads(_b64url_decode(encoded_header))
        if header != {"alg": "HS256", "typ": "JWT"} or not isinstance(payload, dict):
            return None
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject.isascii() or not subject.isdigit() or not 0 < int(subject) < 2**63:
            return None
        now = int(time.time())
        if type(payload.get("exp")) is not int or payload["exp"] <= now:
            return None
        
        return payload
    except Exception:
        return None
