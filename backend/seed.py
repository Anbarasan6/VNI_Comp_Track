"""
seed.py — Creates default admin user for VNI Comp Track system.
Run: python seed.py
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == "admin@vni.com").first()
        if existing:
            print("✓ Admin user already exists: admin@vni.com")
            return

        admin = User(
            name="VNI Admin",
            email="admin@vni.com",
            password_hash=pwd_context.hash("Admin@123"),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("✓ Default admin created successfully!")
        print("  Email   : admin@vni.com")
        print("  Password: Admin@123")
        print("  Role    : admin")
        print("")
        print("⚠  IMPORTANT: Change the password after first login!")

    except Exception as e:
        db.rollback()
        print(f"✗ Error creating admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
