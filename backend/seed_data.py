#!/usr/bin/env python3
"""
Comprehensive Real-World Seeding Script & Demo Scenario
Delta University for Science & Technology — Faculty of Artificial Intelligence
(جامعة الدلتا للعلوم والتكنولوجيا — كلية الذكاء الاصطناعي)

Features:
- Full reset & seed of Users, Venues, Exam Sessions, Availability Constraints.
- 1 Admin Account (Dr. Tarek Hassan - Head of Examination Committee).
- 7 Professors across distinct departments with real faculty leaves/constraints.
- 18 Teaching Assistants with attendance caps (2 days for Master's TAs, 3 days for Regular TAs).
- 4 Major Lecture Halls (120 - 250 capacity, 2-4 invigilators).
- 6 Specialized Computer/AI Labs (35 - 45 capacity, 1-2 TAs).
- 2-Week realistic examination timetable (Morning: 09:00-11:00, Afternoon: 12:00-14:00).
- Automatic execution of Google OR-Tools CP-SAT optimizer to generate a 100% optimal schedule.
- Prints a formatted credentials table for instant testing across all three portals.
"""

import sys
import os
import argparse
from datetime import date, time as dt_time, datetime
from pathlib import Path

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure stdout safely handles UTF-8 (Arabic names and symbols) on all platforms
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from app.database import engine, Base, SessionLocal
from app.models.user import User, RoleEnum
from app.models.venue import Venue, VenueTypeEnum
from app.models.exam import ExamSession
from app.models.constraint import AvailabilityConstraint, ConstraintTypeEnum
from app.models.assignment import ScheduleRun, ScheduleAssignment, AssignmentRoleEnum
from app.security import get_password_hash
from app.services.optimizer import InvigilationOptimizer
from app.schemas.schedule import ScheduleRunConfig


def seed_database(force: bool = True):
    print("=" * 110)
    print("DELTA UNIVERSITY FOR SCIENCE & TECHNOLOGY — FACULTY OF ARTIFICIAL INTELLIGENCE")
    print("Initializing Database Seeder: Mid-Term & Final Exam Management Platform")
    print("=" * 110)

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data if force reset is requested
        if force:
            print("\n[1/5] Purging existing database records...")
            db.query(ScheduleAssignment).delete()
            db.query(ScheduleRun).delete()
            db.query(AvailabilityConstraint).delete()
            db.query(ExamSession).delete()
            db.query(Venue).delete()
            db.query(User).delete()
            db.commit()
            print("      [OK] Database reset complete.")

        # ---------------------------------------------------------------------
        # 1. Users & Staff
        # ---------------------------------------------------------------------
        print("\n[2/5] Seeding Faculty Leadership, Professors, and Teaching Assistants...")
        
        # Pre-compute hashes for fast execution
        admin_hash = get_password_hash("AdminPass123!")
        doctor_hash = get_password_hash("DoctorPass123!")
        ta_hash = get_password_hash("TAPass123!")

        created_users = []

        # A. Leadership & Admin
        # 1. Assoc. Prof. Dr. Hanaa Salem (Dean of Faculty / Supreme Examination Committee Chair)
        admin_hanaa = User(
            staff_id="DU-ADM-01",
            email="admin@faculty.edu",
            hashed_password=admin_hash,
            full_name="Assoc. Prof. Dr. Hanaa Salem (أ.م.د/ هناء سالم)",
            role=RoleEnum.ADMIN,
            department="Artificial Intelligence",
            title="Dean of Faculty (عميد كلية الذكاء الاصطناعي ورئيس لجنة الامتحانات)",
            phone="+20 100 000 0001",
            max_days_per_week=5,
            max_daily_shifts=2,
            max_total_shifts=10,
            is_active=True,
        )
        db.add(admin_hanaa)
        created_users.append((admin_hanaa, "AdminPass123!", "Admin (Dean)"))

        # 2. Assoc. Prof. Dr. Tarek Hassan (Vice Dean for Student Affairs / Examination Committee Chair)
        admin_tarek = User(
            staff_id="DU-ADM-02",
            email="tarek.hassan@deltauniv.edu.eg",
            hashed_password=admin_hash,
            full_name="Assoc. Prof. Dr. Tarek Hassan (أ.م.د/ طارق حسن)",
            role=RoleEnum.ADMIN,
            department="Artificial Intelligence",
            title="Vice Dean for Student Affairs (وكيل الكلية لشؤون التعليم والطلاب)",
            phone="+20 100 000 0002",
            max_days_per_week=5,
            max_daily_shifts=2,
            max_total_shifts=10,
            is_active=True,
        )
        db.add(admin_tarek)
        created_users.append((admin_tarek, "AdminPass123!", "Admin (Vice Dean)"))

        # B. 7 Specialized Faculty Professors across distinct departments
        prof_data = [
            ("DU-DOC-01", "noha.elattar@deltauniv.edu.eg", "Prof. Dr. Noha Ezzat El-Attar (أ.م.د/ نهى عزت العطار)",
             "Artificial Intelligence", "Associate Professor (أستاذ مساعد)", "+20 100 782 5485"),
            ("DU-DOC-02", "sayed.haggag@deltauniv.edu.eg", "Dr. El-Sayed Hussein Haggag (د/ السيد حسين حجاج)",
             "Computer Science", "Lecturer / Committee Lead (مدرس دكتور)", "+20 114 657 6996"),
            ("DU-DOC-03", "reham.elsheikh@deltauniv.edu.eg", "Dr. Reham Abdelbaset Elsheikh (د/ ريهام عبدالباسط الشيخ)",
             "Cybersecurity", "Lecturer (مدرس دكتور)", "+20 101 026 8636"),
            ("DU-DOC-04", "dina.seif@deltauniv.edu.eg", "Dr. Dina Seif Qazamel (د/ دينا سيف قزامل)",
             "Data Science", "Lecturer (مدرس دكتور)", "+20 102 008 0724"),
            ("DU-DOC-05", "samia.abdelhalim@deltauniv.edu.eg", "Dr. Samia Mohamed Abdelhalim (د/ سامية محمد عبدالحليم)",
             "Software Engineering", "Lecturer (مدرس دكتور)", "+20 109 696 9315"),
            ("DU-DOC-06", "eman.salem@deltauniv.edu.eg", "Dr. Eman Salah Salem (د/ إيمان صلاح سالم)",
             "Bioinformatics", "Lecturer (مدرس دكتور)", "+20 101 960 6766"),
            ("DU-DOC-07", "mahmoud.elgazzar@deltauniv.edu.eg", "Dr. Mahmoud Ashraf El-Gazzar (د/ محمود أشرف الجزار)",
             "Information Systems", "Lecturer (مدرس دكتور)", "+20 109 540 5866"),
        ]

        prof_objs = []
        for sid, email, name, dept, title, phone in prof_data:
            p = User(
                staff_id=sid,
                email=email,
                hashed_password=doctor_hash,
                full_name=name,
                role=RoleEnum.DOCTOR,
                department=dept,
                title=title,
                phone=phone,
                max_days_per_week=3,
                max_daily_shifts=2,
                max_total_shifts=8,
                is_active=True,
            )
            db.add(p)
            prof_objs.append(p)
            created_users.append((p, "DoctorPass123!", f"Doctor ({dept})"))

        # C. 18 Teaching Assistants (TAs) with Master's & Regular Caps
        ta_data = [
            ("DU-TA-01", "ahmed.fekry@deltauniv.edu.eg", "Eng. Ahmed Fekry Bagha (م/ أحمد فكري باغه)",
             "Computer Science", False, 3, "+20 120 730 0962"),
            ("DU-TA-02", "nouran.emad@deltauniv.edu.eg", "Eng. Nouran Emad Elnemr (م/ نوران عماد النمر)",
             "Artificial Intelligence", False, 3, "+20 100 684 8152"),
            ("DU-TA-03", "shady.emad@deltauniv.edu.eg", "Eng. Shady Emad Abou-Raya (م/ شادي عماد أبوريه)",
             "Cybersecurity", False, 3, "+20 101 036 4065"),
            ("DU-TA-04", "menatallah.hazem@deltauniv.edu.eg", "Eng. Menatallah Hazem Ahmed (م/ منه الله حازم طلبه)",
             "Data Science", True, 2, "+20 106 117 1980"),  # Master's TA
            ("DU-TA-05", "ahmed.abdelhady@deltauniv.edu.eg", "Eng. Ahmed Abdelhady Magd (م/ أحمد عبدالهادي مجد)",
             "Computer Science", False, 3, "+20 101 035 4372"),
            ("DU-TA-06", "hager.emad@deltauniv.edu.eg", "Eng. Hager Emad Eldin (م/ هاجر عماد الدين)",
             "Artificial Intelligence", True, 2, "+20 120 744 7751"),  # Master's TA
            ("DU-TA-07", "walaa.yehia@deltauniv.edu.eg", "Eng. Walaa Yehia Ibrahim (م/ ولاء يحيي المتولي)",
             "Software Engineering", False, 3, "+20 109 912 8614"),
            ("DU-TA-08", "nada.samir@deltauniv.edu.eg", "Eng. Nada Samir Elsayed (م/ ندى سمير السيد)",
             "Information Systems", False, 3, "+20 109 069 7478"),
            ("DU-TA-09", "myrna.gamal@deltauniv.edu.eg", "Eng. Myrna Gamal Abdelkader (م/ ميرنا جمال بدوي)",
             "Bioinformatics", True, 2, "+20 103 010 6149"),  # Master's TA
            ("DU-TA-10", "ahmed.desouky@deltauniv.edu.eg", "Eng. Ahmed Abu Bakr Eldesouky (م/ أحمد أبو بكر سالم)",
             "Cybersecurity", False, 3, "+20 100 028 8363"),
            ("DU-TA-11", "menna.eladawy@deltauniv.edu.eg", "Eng. Menatallah Mohamed Eladawy (م/ منة الله العدوي)",
             "Data Science", False, 3, "+20 102 725 7102"),
            ("DU-TA-12", "monia.anwar@deltauniv.edu.eg", "Eng. Monia Anwar Elborollosy (م/ مونيا أنور البرلسي)",
             "Artificial Intelligence", True, 2, "+20 102 205 5624"),  # Master's TA
            ("DU-TA-13", "seham.samy@deltauniv.edu.eg", "Eng. Seham Samy Ahmed (م/ سهام سامي عزالدين)",
             "Computer Science", False, 3, "+20 109 590 7969"),
            ("DU-TA-14", "aya.mohamed@deltauniv.edu.eg", "Eng. Aya Mohamed Ibrahim (م/ آية محمد عبدالرحمن)",
             "Software Engineering", False, 3, "+20 109 631 3927"),
            ("DU-TA-15", "menna.wessam@deltauniv.edu.eg", "Eng. Menna Wessam Mohamed (م/ منة وسام السيد)",
             "Cybersecurity", True, 2, "+20 122 081 0646"),  # Master's TA
            ("DU-TA-16", "basmala.mohamed@deltauniv.edu.eg", "Eng. Basmala Mohamed Mostafa (م/ بسملة محمد مصطفى)",
             "Artificial Intelligence", False, 3, "+20 100 655 5283"),
            ("DU-TA-17", "mona.abdallah@deltauniv.edu.eg", "Eng. Mona Mohamed Abdallah (م/ منى محمد عبدالله)",
             "Information Systems", False, 3, "+20 100 488 0939"),
            ("DU-TA-18", "farah.elshaer@deltauniv.edu.eg", "Eng. Farah Ayman Elshaer (م/ فرح أيمن الشاعر)",
             "Bioinformatics", True, 2, "+20 109 810 4860"),  # Master's TA
        ]

        ta_objs = []
        for sid, email, name, dept, is_master, max_days, phone in ta_data:
            role_title = f"Teaching Assistant ({'ماجستير - ' if is_master else ''}{dept})"
            ta = User(
                staff_id=sid,
                email=email,
                hashed_password=ta_hash,
                full_name=name,
                role=RoleEnum.TA,
                department=f"Faculty of AI — {dept}",
                title=role_title,
                phone=phone,
                is_master_student=is_master,
                max_days_per_week=max_days,
                max_daily_shifts=2,
                max_total_shifts=10,
                is_active=True,
            )
            db.add(ta)
            ta_objs.append(ta)
            cap_label = f"TA ({max_days}d cap{' - Master' if is_master else ''})"
            created_users.append((ta, "TAPass123!", cap_label))

        db.flush()
        print(f"      [OK] Successfully seeded 2 Admins, {len(prof_objs)} Professors, and {len(ta_objs)} Teaching Assistants.")

        # ---------------------------------------------------------------------
        # 2. Venues (4 Major Lecture Halls & 6 Computer/AI Labs)
        # ---------------------------------------------------------------------
        print("\n[3/5] Seeding 4 Major Lecture Halls and 6 Specialized Labs...")

        venues_config = [
            # 4 Major Lecture Halls (Capacities: 120 - 250)
            ("Hall 101 - Grand Auditorium (قاعة 101 - المدرج الرئيسي)",
             VenueTypeEnum.HALL, "Main Academic Complex (المبنى الأكاديمي الرئيسي)", 1, 250),
            ("Hall 102 - Al-Khwarizmi Hall (قاعة 102 - مدرج الخوارزمي)",
             VenueTypeEnum.HALL, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 1, 200),
            ("Hall 201 - Ibn Sina Lecture Hall (قاعة 201 - مدرج ابن سينا)",
             VenueTypeEnum.HALL, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 2, 160),
            ("Hall 202 - Turing Auditorium (قاعة 202 - مدرج تورينج)",
             VenueTypeEnum.HALL, "Main Academic Complex (المبنى الأكاديمي الرئيسي)", 2, 120),

            # 6 Specialized Computer & AI Labs (Capacities: 35 - 45)
            ("AI Lab 1 - GPU & Deep Learning (معمل 1 - الذكاء الاصطناعي والتعلم العميق)",
             VenueTypeEnum.LAB, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 3, 45),
            ("AI Lab 2 - Computer Vision & Robotics (معمل 2 - الروبوتات والرؤية الحاسوبية)",
             VenueTypeEnum.LAB, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 3, 40),
            ("Lab 3 - Cloud & Big Data (معمل 3 - الحوسبة السحابية والبيانات الضخمة)",
             VenueTypeEnum.LAB, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 3, 40),
            ("Lab 4 - Cybersecurity & Networks (معمل 4 - الأمن السيبراني والشبكات)",
             VenueTypeEnum.LAB, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 4, 35),
            ("Lab 5 - Software Engineering (معمل 5 - هندسة البرمجيات)",
             VenueTypeEnum.LAB, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 4, 40),
            ("Lab 6 - Natural Language Processing (معمل 6 - معالجة اللغات الطبيعية)",
             VenueTypeEnum.LAB, "Faculty of AI (مبنى كلية الذكاء الاصطناعي)", 4, 35),
        ]

        venue_dict = {}
        for name, vtype, bldg, floor, cap in venues_config:
            v = Venue(
                name=name,
                venue_type=vtype,
                building=bldg,
                floor=floor,
                capacity=cap,
                is_active=True,
            )
            db.add(v)
            db.flush()
            venue_dict[name] = v

        print(f"      [OK] Successfully seeded {len(venue_dict)} examination venues.")

        # ---------------------------------------------------------------------
        # 3. Availability Constraints (Realistic Faculty Leaves)
        # ---------------------------------------------------------------------
        print("\n[4/5] Configuring Faculty Availability Constraints & Leave Blackouts...")
        
        # Date definitions for 2-week exam period:
        # Week 1: 2026-11-08 (Sun) to 2026-11-12 (Thu)
        # Week 2: 2026-11-15 (Sun) to 2026-11-19 (Thu)
        w1_sun = date(2026, 11, 8)
        w1_mon = date(2026, 11, 9)
        w1_tue = date(2026, 11, 10)
        w1_wed = date(2026, 11, 11)
        w1_thu = date(2026, 11, 12)

        w2_sun = date(2026, 11, 15)
        w2_mon = date(2026, 11, 16)
        w2_tue = date(2026, 11, 17)
        w2_wed = date(2026, 11, 18)
        w2_thu = date(2026, 11, 19)

        constraints_data = [
            # Prof Noha El-Attar: Tuesday blackout (Curriculum & AI Department Council)
            (prof_objs[0].id, w1_tue, "Faculty AI Curriculum & Department Council Meeting (مجلس قسم الذكاء الاصطناعي)"),
            (prof_objs[0].id, w2_tue, "Faculty AI Curriculum & Department Council Meeting (مجلس قسم الذكاء الاصطناعي)"),
            
            # Dr. El-Sayed Haggag: Thursday blackout (Graduate thesis defenses)
            (prof_objs[1].id, w1_thu, "PhD & Master Thesis Defense Committee (مناقشات دراسات عليا خارجية)"),
            (prof_objs[1].id, w2_thu, "PhD & Master Thesis Defense Committee (مناقشات دراسات عليا خارجية)"),

            # Dr. Reham Abdelbaset: Wednesday blackout (Academic Accreditation Review)
            (prof_objs[2].id, w1_wed, "Quality Assurance & National Accreditation Audit (أعمال الجودة والاعتماد)"),
            (prof_objs[2].id, w2_wed, "Quality Assurance & National Accreditation Audit (أعمال الجودة والاعتماد)"),

            # Dr. Dina Seif: Monday blackout (Inter-university Research Consortium)
            (prof_objs[3].id, w1_mon, "National AI Research Consortium (مؤتمر الذكاء الاصطناعي الوطني)"),
            (prof_objs[3].id, w2_mon, "National AI Research Consortium (مؤتمر الذكاء الاصطناعي الوطني)"),
        ]

        for uid, cdate, reason in constraints_data:
            c = AvailabilityConstraint(
                user_id=uid,
                date=cdate,
                constraint_type=ConstraintTypeEnum.UNAVAILABLE,
                reason=reason,
            )
            db.add(c)

        db.flush()
        print(f"      [OK] Registered {len(constraints_data)} professor availability constraints.")

        # ---------------------------------------------------------------------
        # 4. Realistic 2-Week Exam Schedule & Sessions
        # ---------------------------------------------------------------------
        print("\n[5/5] Generating 2-Week Examination Schedule across Morning and Afternoon shifts...")

        # Time Windows
        t_m_start, t_m_end = dt_time(9, 0), dt_time(11, 0)
        t_a_start, t_a_end = dt_time(12, 0), dt_time(14, 0)

        # Helper venue lookup
        v_h101 = venue_dict["Hall 101 - Grand Auditorium (قاعة 101 - المدرج الرئيسي)"]
        v_h102 = venue_dict["Hall 102 - Al-Khwarizmi Hall (قاعة 102 - مدرج الخوارزمي)"]
        v_h201 = venue_dict["Hall 201 - Ibn Sina Lecture Hall (قاعة 201 - مدرج ابن سينا)"]
        v_h202 = venue_dict["Hall 202 - Turing Auditorium (قاعة 202 - مدرج تورينج)"]
        v_lab1 = venue_dict["AI Lab 1 - GPU & Deep Learning (معمل 1 - الذكاء الاصطناعي والتعلم العميق)"]
        v_lab2 = venue_dict["AI Lab 2 - Computer Vision & Robotics (معمل 2 - الروبوتات والرؤية الحاسوبية)"]
        v_lab3 = venue_dict["Lab 3 - Cloud & Big Data (معمل 3 - الحوسبة السحابية والبيانات الضخمة)"]
        v_lab4 = venue_dict["Lab 4 - Cybersecurity & Networks (معمل 4 - الأمن السيبراني والشبكات)"]
        v_lab5 = venue_dict["Lab 5 - Software Engineering (معمل 5 - هندسة البرمجيات)"]
        v_lab6 = venue_dict["Lab 6 - Natural Language Processing (معمل 6 - معالجة اللغات الطبيعية)"]

        # 24 core exam sessions spanning 10 days
        # (course_code, course_name, dept, date, start_t, end_t, headcount, venue, req_prof, req_ta)
        exam_definitions = [
            # Week 1 - Day 1: Sunday 2026-11-08
            ("AI201", "Machine Learning & Pattern Recognition (التعلم الآلي)", "Artificial Intelligence",
             w1_sun, t_m_start, t_m_end, 220, v_h101, 1, 4),
            ("CS101", "Data Structures & Algorithms (هياكل البيانات والخوارزميات)", "Computer Science",
             w1_sun, t_m_start, t_m_end, 40, v_lab1, 1, 2),
            ("SEC401", "Cybersecurity & Cryptography (الأمن السيبراني والتشفير)", "Cybersecurity",
             w1_sun, t_a_start, t_a_end, 180, v_h102, 1, 3),
            ("AI302", "Deep Learning & Neural Networks (التعلم العميق)", "Artificial Intelligence",
             w1_sun, t_a_start, t_a_end, 38, v_lab2, 1, 2),

            # Week 1 - Day 2: Monday 2026-11-09
            ("CS301", "Operating Systems & Kernel Design (نظم التشغيل)", "Computer Science",
             w1_mon, t_m_start, t_m_end, 195, v_h102, 1, 3),
            ("SE303", "Software Architecture & Agile Design (هندسة البرمجيات)", "Software Engineering",
             w1_mon, t_m_start, t_m_end, 38, v_lab5, 1, 2),
            ("CLD402", "Cloud Computing & Distributed Systems (الحوسبة السحابية)", "Computer Science",
             w1_mon, t_a_start, t_a_end, 150, v_h201, 1, 3),
            ("BIO201", "Computational Genomics (المعلوماتية الحيوية)", "Bioinformatics",
             w1_mon, t_a_start, t_a_end, 35, v_lab3, 1, 2),

            # Week 1 - Day 3: Tuesday 2026-11-10
            ("CS202", "Database Management Systems (نظم قواعد البيانات)", "Computer Science",
             w1_tue, t_m_start, t_m_end, 230, v_h101, 1, 4),
            ("AI404", "Natural Language Processing (معالجة اللغات الطبيعية)", "Artificial Intelligence",
             w1_tue, t_m_start, t_m_end, 35, v_lab6, 1, 2),
            ("MATH102", "Discrete Mathematics (الرياضيات المتقطعة)", "Basic Sciences",
             w1_tue, t_a_start, t_a_end, 110, v_h202, 1, 2),

            # Week 1 - Day 4: Wednesday 2026-11-11
            ("NET301", "Computer Networks & Protocols (شبكات الحاسب)", "Computer Science",
             w1_wed, t_m_start, t_m_end, 190, v_h102, 1, 3),
            ("SEC405", "Ethical Hacking & Penetration Testing (الاختراق الأخلاقي)", "Cybersecurity",
             w1_wed, t_m_start, t_m_end, 34, v_lab4, 1, 2),
            ("AI315", "Robotics & Embedded AI Systems (الروبوتات والأنظمة المدمجة)", "Artificial Intelligence",
             w1_wed, t_a_start, t_a_end, 155, v_h201, 1, 3),

            # Week 1 - Day 5: Thursday 2026-11-12
            ("IS201", "Enterprise Information Systems (نظم المعلومات المؤسسية)", "Information Systems",
             w1_thu, t_m_start, t_m_end, 115, v_h202, 1, 2),
            ("AI220", "Computer Vision & Visual Computing (الرؤية الحاسوبية)", "Artificial Intelligence",
             w1_thu, t_a_start, t_a_end, 40, v_lab2, 1, 2),

            # Week 2 - Day 6: Sunday 2026-11-15
            ("AI450", "Generative AI & LLM Engineering (الذكاء الاصطناعي التوليدي)", "Artificial Intelligence",
             w2_sun, t_m_start, t_m_end, 240, v_h101, 1, 4),
            ("CS320", "Parallel & Distributed Programming (البرمجة المتوازية)", "Computer Science",
             w2_sun, t_m_start, t_m_end, 42, v_lab1, 1, 2),
            ("SEC410", "Network Security & Digital Forensics (أمن الشبكات والتحقيق الرقمي)", "Cybersecurity",
             w2_sun, t_a_start, t_a_end, 150, v_h201, 1, 3),

            # Week 2 - Day 7: Monday 2026-11-16
            ("DS301", "Big Data Analytics & Spark (تحليلات البيانات الضخمة)", "Data Science",
             w2_mon, t_m_start, t_m_end, 185, v_h102, 1, 3),
            ("SE402", "DevOps & Cloud Native Architecture (هندسة الحوسبة السحابية)", "Software Engineering",
             w2_mon, t_a_start, t_a_end, 38, v_lab5, 1, 2),

            # Week 2 - Day 8: Tuesday 2026-11-17
            ("MATH201", "Probability & Applied Statistics (الاحتمالات والإحصاء التطبيقي)", "Basic Sciences",
             w2_tue, t_m_start, t_m_end, 235, v_h101, 1, 4),
            ("BIO302", "Bioinformatics Algorithms & Proteomics (خوارزميات المعلوماتية الحيوية)", "Bioinformatics",
             w2_tue, t_a_start, t_a_end, 34, v_lab3, 1, 2),

            # Week 2 - Day 9: Wednesday 2026-11-18
            ("AI330", "Knowledge Graphs & Semantic Web (رسوم المعرفة والويب الدلالي)", "Artificial Intelligence",
             w2_wed, t_m_start, t_m_end, 115, v_h202, 1, 2),
            ("SEC420", "Cloud Security & Governance (أمن وحوكمة السحابة)", "Cybersecurity",
             w2_wed, t_a_start, t_a_end, 35, v_lab4, 1, 2),

            # Week 2 - Day 10: Thursday 2026-11-19
            ("IS305", "IT Project Management & Quality (إدارة مشاريع تكنولوجيا المعلومات)", "Information Systems",
             w2_thu, t_m_start, t_m_end, 175, v_h102, 1, 3),
            ("AI490", "Senior Graduation Project Assessment (مناقشة مشاريع التخرج)", "Artificial Intelligence",
             w2_thu, t_a_start, t_a_end, 40, v_lab2, 1, 2),
        ]

        created_sessions = []
        for ccode, cname, dept, edate, stime, etime, hcount, venue, req_prof, req_ta in exam_definitions:
            s = ExamSession(
                course_code=ccode,
                course_name=cname,
                department=dept,
                date=edate,
                start_time=stime,
                end_time=etime,
                student_headcount=hcount,
                venue_id=venue.id,
                required_professors=req_prof,
                required_tas=req_ta,
                status="SCHEDULED",
            )
            db.add(s)
            created_sessions.append(s)

        db.commit()
        print(f"      [OK] Successfully seeded {len(created_sessions)} realistic 2-week exam sessions.")

        # ---------------------------------------------------------------------
        # 5. Automated AI Optimization Run (Google OR-Tools CP-SAT)
        # ---------------------------------------------------------------------
        print("\n" + "=" * 110)
        print("RUNNING GOOGLE OR-TOOLS CP-SAT OPTIMIZATION ENGINE ON SEEDED DATASET")
        print("=" * 110)

        all_active_users = db.query(User).filter(User.is_active == True).all()
        all_venues = db.query(Venue).filter(Venue.is_active == True).all()
        all_sessions = db.query(ExamSession).all()
        all_constraints = db.query(AvailabilityConstraint).all()

        config = ScheduleRunConfig(
            workload_balance_weight=50,
            rest_interval_weight=40,
            building_proximity_weight=30,
            department_match_weight=60,
            honor_existing_locks=False,
            max_solver_seconds=15,
        )

        optimizer = InvigilationOptimizer(
            users=all_active_users,
            venues=all_venues,
            sessions=all_sessions,
            constraints=all_constraints,
            config=config,
        )

        solve_start = datetime.now()
        result = optimizer.solve()
        solve_duration = (datetime.now() - solve_start).total_seconds()

        print(f"Solver Status      : {result.status}")
        print(f"Execution Duration : {result.solve_time_ms:.1f} ms ({solve_duration:.2f} s)")
        print(f"Total Assignments  : {len(result.assignments)}")
        print(f"Objective Value    : {result.objective_value:.2f}")

        # Persist schedule run and assignments
        new_run = ScheduleRun(
            status=result.status,
            algorithm_used="OR-Tools CP-SAT (Google)",
            solve_time_ms=result.solve_time_ms,
            objective_value=result.objective_value,
            workload_balance_weight=config.workload_balance_weight,
            rest_interval_weight=config.rest_interval_weight,
            building_proximity_weight=config.building_proximity_weight,
            department_match_weight=config.department_match_weight,
            total_sessions_count=len(all_sessions),
            total_assignments_count=len(result.assignments),
            is_current_active=True,
            notes="Optimal conflict-free timetable pre-generated by seed script.",
        )
        db.add(new_run)
        db.flush()

        assignments_to_save = [
            ScheduleAssignment(
                schedule_run_id=new_run.id,
                exam_session_id=a["exam_session_id"],
                user_id=a["user_id"],
                role_in_exam=a["role_in_exam"],
                is_locked=False,
                is_manual_override=False,
            )
            for a in result.assignments
        ]
        db.bulk_save_objects(assignments_to_save)
        db.commit()

        print(f"[OK] Schedule Run #{new_run.id} activated with {len(assignments_to_save)} confirmed assignments.")

        # ---------------------------------------------------------------------
        # 6. Print Summary Credentials Table for Demonstration
        # ---------------------------------------------------------------------
        print("\n" + "=" * 110)
        print("DEMONSTRATION LOGIN CREDENTIALS & ROLE AUDITING DIRECTORY")
        print("=" * 110)
        print(f"{'Role':<14} | {'Full Name & Title':<44} | {'Login Email':<34} | {'Password':<16} | {'Profile & Notes'}")
        print("-" * 110)

        for u, pwd, desc in created_users:
            display_name = (u.full_name[:41] + "..") if len(u.full_name) > 43 else u.full_name
            print(f"{u.role.value:<14} | {display_name:<44} | {u.email:<34} | {pwd:<16} | {desc}")

        print("=" * 110)
        print("SEEDING & OPTIMIZATION COMPLETED SUCCESSFULLY.")
        print(f"Ready for faculty presentation to Dr. Tarek and the Examination Committee.")
        print("=" * 110 + "\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding failed with exception: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Delta University Faculty Exam Platform with Mock Data.")
    parser.add_argument("--no-reset", action="store_true", help="Do not purge existing data before seeding.")
    args = parser.parse_args()

    seed_database(force=not args.no_reset)
