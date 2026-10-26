"""Explicit local administrator recovery: python -m app.db.bootstrap_admin.
Prompts privately for a new password and never displays credentials.
"""
from getpass import getpass
from app.db.session import Base, engine, SessionLocal
from app.models.entities import User
from app.models.access import SubjectMembership
from app.core.security import hash_password

def main():
    username = input("Administrator username: ").strip().lower()
    email = input("Administrator email: ").strip().lower()
    password = getpass("New private password (12+ characters): ")
    if len(username) < 3 or len(password) < 12 or "@" not in email:
        raise SystemExit("A username, email and password of at least 12 characters are required.")
    if password != getpass("Confirm new password: "):
        raise SystemExit("Passwords did not match.")
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if user is None:
            user = User(username=username, email=email, full_name="Academic Administrator")
            db.add(user)
        elif user.username != username or user.email != email:
            raise SystemExit("Username and email identify different accounts.")
        user.hashed_password = hash_password(password)
        user.role = "ADMIN"
        user.is_active = 1
        db.commit()
    print("Administrator account is ready.")

if __name__ == "__main__":
    main()
