import sqlite3
import os

db_paths = [
    os.path.abspath("invigilation.db"),
    os.path.abspath(os.path.join("backend", "invigilation.db")),
    "/home/azureuser/delta-exam-scheduler/backend/invigilation.db",
    "/home/azureuser/delta-exam-scheduler/invigilation.db",
]

for p in db_paths:
    if not os.path.exists(p):
        continue
    print(f"Migrating database: {p}")
    conn = sqlite3.connect(p)
    cur = conn.cursor()

    # Enable WAL
    cur.execute("PRAGMA journal_mode=WAL;")
    cur.execute("PRAGMA synchronous=NORMAL;")
    cur.execute("PRAGMA busy_timeout=10000;")

    # Check columns
    cur.execute("PRAGMA table_info(users)")
    cols = [r[1] for r in cur.fetchall()]
    print(f"  Existing columns: {cols}")

    if "max_days_per_week" not in cols:
        print("  Adding column 'max_days_per_week'...")
        cur.execute("ALTER TABLE users ADD COLUMN max_days_per_week INTEGER DEFAULT 3")
        conn.commit()
        print("  [OK] Added max_days_per_week.")
    else:
        print("  [OK] Column 'max_days_per_week' already exists.")

    # Enforce data consistency
    cur.execute("UPDATE users SET max_days_per_week = 2 WHERE is_master_student = 1")
    cur.execute("UPDATE users SET max_days_per_week = 3 WHERE (is_master_student = 0 OR is_master_student IS NULL) AND role = 'TA'")
    conn.commit()
    conn.close()
    print(f"  [OK] Successfully migrated and optimized {p}\n")
