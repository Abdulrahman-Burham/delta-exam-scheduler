"""
Enterprise Auth Seed Script
Generates 1 default Admin (Head of Committee / Doctor Tarek), 1 Doctor, and 1 TA account with bcrypt-hashed passwords.
"""
import uuid
import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import SessionLocal, engine, Base
from app.models.user import User, RoleEnum
from app.security import get_password_hash


def seed_security_accounts():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    accounts = [
        {
            "staff_id": "ADMIN-001",
            "email": "admin@faculty.edu",
            "password": "AdminPass123!",
            "full_name": "Assoc. Prof. Dr. Tarek Hassan (أ.م.د/ طارق حسن - وكيل الكلية)",
            "role": RoleEnum.ADMIN,
            "department": "Artificial Intelligence",
            "title": "Head of Exam Committee (وكيل الكلية لشؤون التعليم والطلاب)",
            "phone": "+20 100 000 0001",
            "is_master_student": False,
        },
        {
            "staff_id": "DOCTOR-001",
            "email": "doctor@faculty.edu",
            "password": "DoctorPass123!",
            "full_name": "Dr. El-Sayed Hussein Haggag (د/ السيد حسين حجاج)",
            "role": RoleEnum.DOCTOR,
            "department": "Computer Science & AI",
            "title": "Faculty Member / Lead Examiner (عضو هيئة التدريس)",
            "phone": "+20 100 000 0002",
            "is_master_student": False,
        },
        {
            "staff_id": "TA-001",
            "email": "ta@faculty.edu",
            "password": "TAPass123!",
            "full_name": "Eng. Ahmed Fekry Bagha (م. أحمد فكري باغه)",
            "role": RoleEnum.TA,
            "department": "Faculty of Artificial Intelligence",
            "title": "Teaching Assistant / Invigilator (معيد بلجان الامتحانات)",
            "phone": "+20 100 000 0003",
            "is_master_student": False,
        },
    ]

    print("\n[SEC] Seeding Hardened RBAC Security Accounts:")
    print("=" * 65)

    created_or_updated = []
    for acc in accounts:
        user = db.query(User).filter(User.email == acc["email"]).first()
        hashed = get_password_hash(acc["password"])
        if user:
            user.hashed_password = hashed
            user.role = acc["role"]
            user.full_name = acc["full_name"]
            user.title = acc["title"]
            user.is_active = True
            action = "UPDATED"
        else:
            user = User(
                id=str(uuid.uuid4()),
                staff_id=acc["staff_id"],
                email=acc["email"],
                hashed_password=hashed,
                full_name=acc["full_name"],
                role=acc["role"],
                department=acc["department"],
                title=acc["title"],
                phone=acc["phone"],
                is_master_student=acc["is_master_student"],
                max_daily_shifts=3,
                max_total_shifts=25,
                is_active=True,
            )
            db.add(user)
            action = "CREATED"

        db.flush()
        created_or_updated.append((acc["email"], acc["password"], acc["role"].value, action, str(user.id)))

    db.commit()
    db.close()

    for email, pwd, role, action, uid in created_or_updated:
        print(f"[{action}] Role: {role:<8} | Email: {email:<20} | Password: {pwd:<15} | UUID: {uid}")
    print("=" * 65)
    print("[SUCCESS] Successfully seeded 3 core role accounts (Admin, Doctor, TA).\n")


if __name__ == "__main__":
    seed_security_accounts()
