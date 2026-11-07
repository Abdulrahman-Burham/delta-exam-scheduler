import os
import sys
import glob
import re
import pandas as pd
from datetime import datetime, time, date

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from app.database import engine, SessionLocal, Base
from app.models import *
from app.models.student import Student, StudentSeating

sys.stdout.reconfigure(encoding="utf-8")


def parse_file_metadata(df, filepath, dept_name):
    meta = {
        "date": None,
        "start_time": None,
        "end_time": None,
        "course_name": None,
        "course_code": None,
        "venue_name": None,
        "department": dept_name,
    }

    for r in range(min(12, df.shape[0])):
        line = " ".join([str(x).strip() for x in df.iloc[r].dropna().tolist() if str(x).strip()])

        # Date
        m_date = re.search(r"(\d{1,2}[-/]\d{1,2}[-/]\d{4})", line)
        if m_date and not meta["date"]:
            raw_d = m_date.group(1).replace("/", "-")
            try:
                meta["date"] = datetime.strptime(raw_d, "%d-%m-%Y").date()
            except ValueError:
                try:
                    meta["date"] = datetime.strptime(raw_d, "%m-%d-%Y").date()
                except ValueError:
                    pass

        # Time
        m_time = re.search(
            r"(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))",
            line,
            re.IGNORECASE,
        )
        if m_time and not meta["start_time"]:
            st_raw = m_time.group(1).strip()
            et_raw = m_time.group(2).strip()
            if "AM" not in st_raw.upper() and "PM" not in st_raw.upper():
                st_raw += " PM" if "PM" in et_raw.upper() else " AM"
            try:
                meta["start_time"] = datetime.strptime(st_raw, "%I:%M %p").time()
            except ValueError:
                pass
            try:
                meta["end_time"] = datetime.strptime(et_raw, "%I:%M %p").time()
            except ValueError:
                pass

        # Course
        if "Course title:" in line or "Course Code:" in line:
            parts = line.split("Course Code:")
            cname = parts[0].replace("Course title:", "").replace("Course title :", "").strip()
            if cname:
                meta["course_name"] = cname.strip(" |:")
            if len(parts) > 1:
                meta["course_code"] = parts[1].strip(" |:")
        elif not meta["course_name"] and ("AI " in line or "SEC" in line or "BIO" in line) and ("Mid" not in line):
            meta["course_name"] = line

        # Place / Venue
        if "Place:" in line or "Place :" in line:
            p = re.split(r"Place\s*:", line)[-1].strip()
            p = p.split("كلية")[0].strip()
            meta["venue_name"] = p
        elif not meta["venue_name"] and re.search(r"Lab\s*\d+", line, re.IGNORECASE):
            m_lab = re.search(r"(Lab\s*\d+\s*(?:\(\d+\))?)", line, re.IGNORECASE)
            if m_lab:
                meta["venue_name"] = m_lab.group(1).strip()

    # Fallback venue from file name
    if not meta["venue_name"]:
        m_lab = re.search(r"(Lab\s*\d+\s*(?:\(\d+\))?)", os.path.basename(filepath), re.IGNORECASE)
        if m_lab:
            meta["venue_name"] = m_lab.group(1).strip()

    # Fallback course from folder name
    if not meta["course_name"]:
        parent = os.path.basename(os.path.dirname(filepath))
        meta["course_name"] = parent

    return meta


def main():
    print("=================================================================")
    print("DELTA UNIVERSITY FACULTY EXAM ROSTER INGESTION PIPELINE")
    print("=================================================================")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Build quick lookups for sessions and venues
    all_venues = db.query(Venue).all()
    venue_map = {v.name.lower().replace(" ", ""): v for v in all_venues}

    all_sessions = db.query(ExamSession).all()

    # Clear existing student and seating records to prevent duplicates during re-seed
    print("Clearing prior student records...")
    db.query(StudentSeating).delete()
    db.query(Student).delete()
    db.commit()

    all_files = glob.glob("data/all_rosters/**/*.xlsx", recursive=True)
    print(f"Discovered {len(all_files)} total Excel rosters.")

    student_cache = {}  # student_code -> Student object
    total_seatings_added = 0
    total_students_added = 0

    for idx, filepath in enumerate(all_files, start=1):
        norm = os.path.normpath(filepath).replace("\\", "/")
        parts = norm.split("/")
        dept_name = "Artificial Intelligence"
        if "cybersecurity" in parts:
            dept_name = "Cybersecurity"
        elif "bioinformatics" in parts:
            dept_name = "Bioinformatics"

        try:
            df = pd.read_excel(filepath, header=None)
            meta = parse_file_metadata(df, filepath, dept_name)

            # Locate table header
            header_row_idx = None
            for r in range(min(18, df.shape[0])):
                row_str = " ".join([str(x) for x in df.iloc[r].dropna().tolist()])
                if "كود الطالب" in row_str or "اسم الطالب" in row_str:
                    header_row_idx = r
                    break
            if header_row_idx is None:
                continue

            header_row = [str(x).strip() for x in df.iloc[header_row_idx].tolist()]
            code_col = None
            name_col = None
            for c, val in enumerate(header_row):
                if "كود" in val:
                    code_col = c
                elif "اسم الطالب" in val or ("اسم" in val and "المقرر" not in val):
                    name_col = c

            if code_col is None or name_col is None:
                continue

            # Resolve venue id
            matched_venue = None
            if meta["venue_name"]:
                clean_v = meta["venue_name"].lower().replace(" ", "")
                for k, v in venue_map.items():
                    if k in clean_v or clean_v in k:
                        matched_venue = v
                        break

            # Resolve session id if date and venue match
            matched_session = None
            for sess in all_sessions:
                if meta["date"] and sess.date == meta["date"]:
                    if matched_venue and sess.venue_id == matched_venue.id:
                        matched_session = sess
                        break
                    elif meta["course_name"] and (
                        meta["course_name"].lower() in sess.course_name.lower()
                        or sess.course_name.lower() in meta["course_name"].lower()
                    ):
                        matched_session = sess
                        break

            seat_num = 1
            for r in range(header_row_idx + 1, df.shape[0]):
                code_val = df.iloc[r, code_col]
                name_val = df.iloc[r, name_col]
                if pd.isna(code_val) or pd.isna(name_val):
                    continue

                code_str = str(code_val).replace(".0", "").strip()
                name_str = str(name_val).strip()

                if not code_str or not name_str or code_str in ["م", "كود"]:
                    continue
                if len(code_str) < 4 or not any(ch.isdigit() for ch in code_str):
                    continue

                # Get or create student
                if code_str not in student_cache:
                    st = Student(
                        student_code=code_str,
                        full_name=name_str,
                        department=dept_name,
                        academic_year="2026-2027",
                    )
                    db.add(st)
                    db.flush()
                    student_cache[code_str] = st
                    total_students_added += 1
                else:
                    st = student_cache[code_str]

                # Create seating assignment
                seating = StudentSeating(
                    student_id=st.id,
                    exam_session_id=matched_session.id if matched_session else None,
                    venue_id=matched_venue.id if matched_venue else None,
                    course_name=meta["course_name"] or "Course Exam",
                    department=dept_name,
                    venue_name=meta["venue_name"] or "Exam Hall",
                    exam_date=meta["date"],
                    start_time=meta["start_time"],
                    end_time=meta["end_time"],
                    seat_number=seat_num,
                    attendance_status="PENDING",
                )
                db.add(seating)
                total_seatings_added += 1
                seat_num += 1

            if idx % 25 == 0 or idx == len(all_files):
                db.commit()
                print(f"[{idx}/{len(all_files)}] Processed rosters... Cumulative: {total_students_added} students, {total_seatings_added} seatings.")

        except Exception as e:
            print(f"Error processing {filepath}: {e}")

    db.commit()
    db.close()

    print("\n=================================================================")
    print("INGESTION COMPLETED SUCCESSFULLY!")
    print(f"✓ Total Unique Students Created   : {total_students_added}")
    print(f"✓ Total Exam Seatings Assigned    : {total_seatings_added}")
    print("=================================================================")


if __name__ == "__main__":
    main()
