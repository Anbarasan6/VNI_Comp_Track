"""
Clear ALL data from the database and re-seed only the admin user.
Run: .\venv\Scripts\python.exe clear_data.py
"""
from app.database import SessionLocal, engine, Base
from app.models import *  # noqa: F401, F403 - ensures all models are loaded
from app.models.user import User, UserRole
from app.models.professor import Professor
from app.models.book import Book
from app.models.request import Request, RequestBook
from app.models.faculty_info import FacultyInfo
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

try:
    print("Clearing all data...")

    # Delete in dependency order (child tables first)
    deleted = db.query(RequestBook).delete()
    print(f"  Deleted {deleted} request_books")

    deleted = db.query(Request).delete()
    print(f"  Deleted {deleted} requests")

    deleted = db.query(Professor).delete()
    print(f"  Deleted {deleted} professors")

    deleted = db.query(Book).delete()
    print(f"  Deleted {deleted} books")

    deleted = db.query(FacultyInfo).delete()
    print(f"  Deleted {deleted} faculty_info records")

    deleted = db.query(User).delete()
    print(f"  Deleted {deleted} users")

    db.commit()
    print("All data cleared.\n")

    # Re-seed admin user
    admin = User(
        name="VNI Admin",
        email="admin@vni.com",
        password_hash=pwd_context.hash("Admin@123"),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("Admin user re-created:")
    print(f"  Email:    admin@vni.com")
    print(f"  Password: Admin@123")
    print(f"  ID:       {admin.id}")
    print("\nDatabase is clean and ready.")

except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()
