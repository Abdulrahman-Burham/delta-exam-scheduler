import re
from datetime import date, time
from sqlalchemy.orm import Session

from app.models.user import User, RoleEnum
from app.models.venue import Venue, VenueTypeEnum
from app.models.exam import ExamSession
from app.models.constraint import AvailabilityConstraint, ConstraintTypeEnum
from app.models.assignment import ScheduleRun, ScheduleAssignment
from app.security import get_password_hash


def seed_database(db: Session, force: bool = False):
    """
    Populates the database with the official Delta University for Science and Technology
    Faculty of Artificial Intelligence (جامعة الدلتا للعلوم والتكنولوجيا - كلية الذكاء الاصطناعي)
    Mid-Term Exam Fall 2026-2027 timetable, venues, and full faculty/staff registry.
    """
    if not force and db.query(User).first():
        return

    # If force, clear existing
    if force:
        db.query(ScheduleAssignment).delete()
        db.query(ScheduleRun).delete()
        db.query(AvailabilityConstraint).delete()
        db.query(ExamSession).delete()
        db.query(Venue).delete()
        db.query(User).delete()
        db.commit()

    # ----------------------------------------------------
    # 1. Leadership (Dean & Vice Dean)
    # ----------------------------------------------------
    dean = User(
        staff_id="DEAN-01",
        email="admin@faculty.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Assoc. Prof. Dr. Hanaa Salem (أ.م.د/ هناء سالم)",
        role=RoleEnum.ADMIN,
        department="Artificial Intelligence",
        title="Dean of Faculty (عميد الكلية)",
        phone="+20 100 000 0001",
        max_daily_shifts=2,
        max_total_shifts=6,
        is_active=True,
    )
    db.add(dean)

    vice_dean = User(
        staff_id="VDEAN-02",
        email="tarek.hassan@deltauniv.edu.eg",
        hashed_password=get_password_hash("ProfPass123!"),
        full_name="Assoc. Prof. Dr. Tarek Hassan (أ.م.د/ طارق حسن)",
        role=RoleEnum.ADMIN,
        department="Artificial Intelligence",
        title="Vice Dean (وكيل الكلية لشؤون التعليم والطلاب)",
        phone="+20 100 000 0002",
        max_daily_shifts=2,
        max_total_shifts=6,
        is_active=True,
    )
    db.add(vice_dean)

    # ----------------------------------------------------
    # 2. Official Faculty Registry (Doctors & TAs from the official document)
    # ----------------------------------------------------
    # (id_num, arabic_name, phone, role, english_slug)
    official_advisors = [
        (1, "م. أحمد فكري باغه", "01207300962", RoleEnum.TA, "Ahmed Fekry Bagha"),
        (2, "م. منه الله حازم احمد طلبه", "01061171980", RoleEnum.TA, "Menatallah Hazem Ahmed"),
        (3, "م. أحمد عبدالهادي مجد عبدالهادي", "01010354372", RoleEnum.TA, "Ahmed Abdelhady Magd"),
        (4, "م. هاجر عماد الدين عبدالرحمن", "01207447751", RoleEnum.TA, "Hager Emad Eldin"),
        (5, "م. ولاء يحيي ابراهيم المتولي", "01099128614", RoleEnum.TA, "Walaa Yehia Ibrahim"),
        (6, "م. ندي سمير السيد محمد", "01090697478", RoleEnum.TA, "Nada Samir Elsayed"),
        (7, "م. نوران عماد محمد النمر", "01006848152", RoleEnum.TA, "Nouran Emad Elnemr"),
        (8, "م. ميرنا جمال عبدالقدير بدوي", "01030106149", RoleEnum.TA, "Myrna Gamal Abdelkader"),
        (9, "م. احمد ابو بكر الدسوقي سالم", "01000288363", RoleEnum.TA, "Ahmed Abu Bakr Eldesouky"),
        (10, "م. منة الله محمد العدوي", "01027257102", RoleEnum.TA, "Menatallah Mohamed Eladawy"),
        (11, "م. مونيا أنور محمد أحمد البرلسي", "01022055624", RoleEnum.TA, "Monia Anwar Elborollosy"),
        (12, "م. سهام سامي أحمد عزالدين", "01095907969", RoleEnum.TA, "Seham Samy Ahmed"),
        (13, "م. أيه محمد إبراهيم عبدالرحمن", "01096313927", RoleEnum.TA, "Aya Mohamed Ibrahim"),
        (14, "م. منه وسام محمد السيد", "01220810646", RoleEnum.TA, "Menna Wessam Mohamed"),
        (15, "م. بسمله محمد مصطفي محمد", "01006555283", RoleEnum.TA, "Basmala Mohamed Mostafa"),
        (16, "م. منى محمد عبدالله محمد", "01004880939", RoleEnum.TA, "Mona Mohamed Abdallah"),
        (17, "م. شادي عماد أحمد أبوريه", "01010364065", RoleEnum.TA, "Shady Emad Abou-Raya"),
        (18, "م. فرح أيمن عبدالبصير الشاعر", "01098104860", RoleEnum.TA, "Farah Ayman Elshaer"),
        (19, "م. سلمى خالد محمود فوده", "01017765612", RoleEnum.TA, "Salma Khaled Fouda"),
        (20, "م. مريم وديع بباوي", "01203696556", RoleEnum.TA, "Mariam Wadie"),
        (21, "م. ايه السيد المتولي", "01000959621", RoleEnum.TA, "Aya Elsayed Elmetwally"),
        (22, "م. خلود سعيد حارس محمد", "01005471828", RoleEnum.TA, "Kholoud Saeed Hares"),
        (23, "م. تقوى الباز السيد الصاوي الباز", "01151288600", RoleEnum.TA, "Taqwa Elbaz Elsayed"),
        (24, "م. يوسف احمد محمد قنديل", "01011382910", RoleEnum.TA, "Youssef Ahmed Qandil"),
        (25, "م. دعاء مصطفي ابراهيم درويش", "01097420287", RoleEnum.TA, "Doaa Mostafa Darwish"),
        (26, "م. مريم أحمد محمد المرشدي", "01060527014", RoleEnum.TA, "Mariam Ahmed Elmershedy"),
        (27, "م. ايمان عصام عبدالمطلب", "01120220587", RoleEnum.TA, "Eman Essam Abdelmoteleb"),
        (28, "م. منار سيد محمد عوض", "01092835540", RoleEnum.TA, "Manar Sayed Mohamed"),
        (29, "م.م. مروة محمد محمد الشهاوي", "01095405866", RoleEnum.PROFESSOR, "Marwa Mohamed Elshahawy"),
        (30, "م. تقي أحمد عبدالحميد البيلي", "01099524281", RoleEnum.TA, "Toqa Ahmed Elbely"),
        (31, "م. اسراء تامر جابر محمد", "01026013481", RoleEnum.TA, "Esraa Tamer Gaber"),
        (32, "د/ ريهام عبدالباسط الشيخ", "01010268636", RoleEnum.PROFESSOR, "Dr. Reham Abdelbaset Elsheikh"),
        (33, "م.م. نجلاء رجب ابراهيم خليل", "01007815018", RoleEnum.PROFESSOR, "Naglaa Ragab Khalil"),
        (34, "م. نسرين محمد عزالدين", "01155069906", RoleEnum.TA, "Nesreen Mohamed Ezzeldin"),
        (35, "م. إيثار ابراهيم محمد ابراهيم", "01020478562", RoleEnum.TA, "Ethar Ibrahim Mohamed"),
        (36, "م. دنيا محمد عبدالهادي", "01064597190", RoleEnum.TA, "Donia Mohamed Abdelhady"),
        (37, "م. ريناد محمد محمود السيد", "01021887653", RoleEnum.TA, "Renad Mohamed Mahmoud"),
        (38, "م. علياء غانم على محمد", "01030337354", RoleEnum.TA, "Alya Ghanem Aly"),
        (39, "م. خالد محمد عبدالعزيز اسماعيل", "01090244122", RoleEnum.TA, "Khaled Mohamed Abdelaziz"),
        (40, "م. هدير محمد شريف السيد", "01012091243", RoleEnum.TA, "Hadeer Mohamed Sherif"),
        (41, "د. دينا سيف قزامل", "01020080724", RoleEnum.PROFESSOR, "Dr. Dina Seif Qazamel"),
        (42, "د. سامية محمد محمد عبدالحليم", "01096969315", RoleEnum.PROFESSOR, "Dr. Samia Mohamed Abdelhalim"),
        (43, "م. بسمه رضا الششتاوي", "01555783113", RoleEnum.TA, "Basma Reda Elseshtawy"),
        (44, "م. نورين ابراهيم عبد الستار", "01039254930", RoleEnum.TA, "Nourine Ibrahim Abdel Sattar"),
        (45, "م. روضه فتحي محمد", "01090827749", RoleEnum.TA, "Rowda Fathy Mohamed"),
        (46, "م. ياسين أحمد عسيلي", "01050750787", RoleEnum.TA, "Yassin Ahmed Eseily"),
        (47, "م. ملك شريف محمد الهمشري", "01210017350", RoleEnum.TA, "Malak Sherif Elhamshary"),
        (48, "م. جنا محمد رضا درويش", "01022699030", RoleEnum.TA, "Gana Mohamed Reda"),
        (49, "م. نورهان سامي علي محمد", "01095442809", RoleEnum.TA, "Nourhan Samy Aly"),
        (50, "م. أسامة إبراهيم مصطفي شبانه", "01099387303", RoleEnum.TA, "Osama Ibrahim Shabana"),
        (51, "م. منيرة اشرف نبيل", "01007838940", RoleEnum.TA, "Monira Ashraf Nabil"),
        (52, "م. ريم محمد الحسيني", "01011382447", RoleEnum.TA, "Reem Mohamed El-Husseiny"),
        (53, "م. شهد عبدالغفار كمال", "01093700627", RoleEnum.TA, "Shahd Abdelghaffar Kamal"),
        (54, "م. احمد رضا محمد لبيب", "01003765708", RoleEnum.TA, "Ahmed Reda Labib"),
        (55, "م. لبنى احمد السيد عبداللطيف رخا", "01001166515", RoleEnum.TA, "Lobna Ahmed Rakha"),
        (56, "م. نور حسام الدين شمس الدين", "01041418233", RoleEnum.TA, "Nour Hossam Shams"),
        (57, "م. يوسف محمد عبدالباري موسى", "01500551920", RoleEnum.TA, "Youssef Mohamed Moussa"),
        (58, "م. طارق تامر ابراهيم الحسيني دره", "01028141736", RoleEnum.TA, "Tarek Tamer Dorrah"),
        (59, "م. سلمى محمد السيد محمود الحسيني الشهاوي", "01062465441", RoleEnum.TA, "Salma Mohamed Elshahawy"),
        (60, "م. تقي وائل صلاح عبد الفتاح مصطفى", "01041126630", RoleEnum.TA, "Toqa Wael Mostafa"),
        (61, "م. ابراهيم محمد ابراهيم احمد الماريه", "01068872421", RoleEnum.TA, "Ibrahim Mohamed Elmaria"),
        (62, "د/ السيد حسين حجاج", "01146576996", RoleEnum.PROFESSOR, "Dr. El-Sayed Hussein Haggag"),
        (63, "أ.م.د/ نهى عزت العطار", "01007825485", RoleEnum.PROFESSOR, "Assoc. Prof. Dr. Noha Ezzat El-Attar"),
        (64, "د/ إيمان صلاح سالم", "01019606766", RoleEnum.PROFESSOR, "Dr. Eman Salah Salem"),
    ]

    for id_num, ar_name, phone, role, en_slug in official_advisors:
        email = f"staff{id_num:02d}@deltauniv.edu.eg"
        # Create convenient emails for primary demo users
        if id_num == 1:
            email = "ahmed.fekry@deltauniv.edu.eg"
        elif id_num == 7:
            email = "nouran.emad@deltauniv.edu.eg"
        elif id_num == 17:
            email = "shady.emad@deltauniv.edu.eg"
        elif id_num == 63:
            email = "noha.elattar@deltauniv.edu.eg"
        elif id_num == 62:
            email = "sayed.haggag@deltauniv.edu.eg"

        # Master's degree students get 2 days off per week for research & thesis
        master_ids = {2, 4, 8, 14, 20, 24, 28, 34, 38, 48, 56, 58}
        is_master = (role == RoleEnum.TA and id_num in master_ids)

        user = User(
            staff_id=f"DU-AI-{id_num:03d}",
            email=email,
            hashed_password=get_password_hash("DeltaPass123!"),
            full_name=f"{en_slug} ({ar_name})",
            role=role,
            department="Faculty of Artificial Intelligence (كلية الذكاء الاصطناعي)",
            title="Professor / Lecturer" if role == RoleEnum.PROFESSOR else ("Teaching Assistant (ماجستير)" if is_master else "Teaching Assistant (معيد)"),
            phone=phone,
            is_master_student=is_master,
            max_daily_shifts=3,
            max_total_shifts=25,
            is_active=True,
        )
        db.add(user)

    # ----------------------------------------------------
    # 3. Official Venues from Page 5 (أماكن الامتحانات)
    # ----------------------------------------------------
    # AI Faculty Labs (Labs 1 to 12)
    ai_labs = [
        ("Lab1", 405, 40),
        ("Lab2", 410, 40),
        ("Lab3", 411, 40),
        ("Lab4", 412, 40),
        ("Lab5", 414, 40),
        ("Lab6", 420, 40),
        ("Lab7", 421, 40),
        ("Lab8", 425, 40),
        ("Lab9", 428, 40),
        ("Lab10", 306, 40),
        ("Lab11", 307, 40),
        ("Lab12", 308, 40),
    ]

    venue_map = {}
    for lab_name, room_no, cap in ai_labs:
        v = Venue(
            name=f"{lab_name} (Room {room_no})",
            venue_type=VenueTypeEnum.LAB,
            building="Faculty of AI Building (مبنى كلية الذكاء الاصطناعي)",
            floor=int(str(room_no)[0]),
            capacity=cap,
            is_active=True,
        )
        db.add(v)
        venue_map[lab_name] = v

    # Other Faculties Venues (Page 5)
    external_venues = [
        ("PT (Physical Therapy)", VenueTypeEnum.HALL, "Faculty of Physical Therapy (العلاج الطبيعي)", 3, 308, 60),
        ("M1", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 101, 50),
        ("M2", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 102, 50),
        ("M3", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 103, 50),
        ("M4", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 104, 50),
        ("M5", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 105, 50),
        ("M6", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 107, 50),
        ("M7", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 108, 50),
        ("M8", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 109, 50),
        ("M9", VenueTypeEnum.HALL, "Faculty of Medicine (الطب البشري)", 1, 115, 50),
        ("E1", VenueTypeEnum.HALL, "Faculty of Engineering (الهندسة)", 1, 116, 50),
        ("E2", VenueTypeEnum.HALL, "Faculty of Engineering (الهندسة)", 1, 117, 50),
        ("E3", VenueTypeEnum.HALL, "Faculty of Engineering (الهندسة)", 4, 438, 50),
        ("E4", VenueTypeEnum.HALL, "Faculty of Engineering (الهندسة)", 4, 439, 50),
        ("P1", VenueTypeEnum.HALL, "Faculty of Energy Engineering (هندسة الطاقة)", 2, 211, 45),
        ("P2", VenueTypeEnum.HALL, "Faculty of Energy Engineering (هندسة الطاقة)", 2, 212, 45),
        ("P3", VenueTypeEnum.HALL, "Faculty of Energy Engineering (هندسة الطاقة)", 3, 313, 45),
        ("B1", VenueTypeEnum.HALL, "Faculty of Business (الإدارة)", 1, 101, 50),
        ("B2", VenueTypeEnum.HALL, "Faculty of Business (الإدارة)", 1, 108, 50),
        ("Ph1", VenueTypeEnum.HALL, "Faculty of Pharmacy (الصيدلة)", 3, 323, 50),
        ("Ph2", VenueTypeEnum.HALL, "Faculty of Pharmacy (الصيدلة)", 1, 8, 50),
    ]

    for short_code, vtype, bldg, fl, room_no, cap in external_venues:
        v = Venue(
            name=f"{short_code} (Room {room_no})",
            venue_type=vtype,
            building=bldg,
            floor=fl,
            capacity=cap,
            is_active=True,
        )
        db.add(v)
        venue_map[short_code] = v

    db.flush()

    # ----------------------------------------------------
    # 4. Exam Sessions from Pages 1 to 4 of Final Time Table
    # ----------------------------------------------------
    # Parse sessions into room-specific slots so each allocated room gets invigilators!
    raw_schedule = [
        # --- Saturday 7-11-2026 ---
        ("BAS112", "Calculus", "Basic Sciences", date(2026, 11, 7), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS112", "Calculus (Group 2)", "Basic Sciences", date(2026, 11, 7), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS112", "Calculus (Group 3)", "Basic Sciences", date(2026, 11, 7), time(11, 15), time(12, 0), 82,
         ["Lab6", "Lab7"]),
        ("AI 413", "Interactive Systems Design", "Artificial Intelligence", date(2026, 11, 7), time(11, 15), time(12, 0), 221,
         ["Lab4", "Lab5", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("CSC311", "Big Data Analytics", "Computer Science", date(2026, 11, 7), time(13, 15), time(14, 0), 262,
         ["Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("CSC311", "Big Data Analytics (Group 2)", "Computer Science", date(2026, 11, 7), time(14, 15), time(15, 0), 284,
         ["Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BIO411", "Genetic Engineering", "Bioinformatics", date(2026, 11, 7), time(15, 15), time(16, 0), 121,
         ["Lab2", "Lab3", "Lab4", "Lab6"]),
        ("SECE43", "Virtualization and Cloud Security", "Cybersecurity", date(2026, 11, 7), time(15, 15), time(16, 0), 191,
         ["Lab5", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11"]),
        ("AI325", "Human Computer Interaction", "Artificial Intelligence", date(2026, 11, 7), time(15, 15), time(16, 0), 15,
         ["Lab11"]),

        # --- Sunday 8-11-2026 ---
        ("BAS113", "Linear Algebra", "Basic Sciences", date(2026, 11, 8), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS113", "Linear Algebra (Group 2)", "Basic Sciences", date(2026, 11, 8), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS113", "Linear Algebra (Group 3)", "Basic Sciences", date(2026, 11, 8), time(11, 15), time(12, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS113", "Linear Algebra (Group 4)", "Basic Sciences", date(2026, 11, 8), time(12, 15), time(13, 0), 118,
         ["Lab3", "Lab4", "Lab10", "Lab11"]),
        ("BAS126", "Discrete Structures", "Basic Sciences", date(2026, 11, 8), time(12, 15), time(13, 0), 146,
         ["Lab5", "Lab7", "Lab8", "Lab9"]),
        ("CSC222", "Computer Graphics and Vision", "Computer Science", date(2026, 11, 8), time(12, 15), time(13, 0), 43,
         ["Lab6"]),
        ("AI314", "Agent Based Systems", "Artificial Intelligence", date(2026, 11, 8), time(13, 15), time(14, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI314", "Agent Based Systems (Group 2)", "Artificial Intelligence", date(2026, 11, 8), time(14, 15), time(15, 0), 121,
         ["Lab1", "Lab2", "Lab3", "Lab6"]),
        ("BIO315", "Molecular and cell biology", "Bioinformatics", date(2026, 11, 8), time(14, 15), time(15, 0), 81,
         ["Lab7", "Lab8"]),
        ("AIMATH2", "Mathematics for AI", "Artificial Intelligence", date(2026, 11, 8), time(15, 15), time(16, 0), 185,
         ["Lab3", "Lab4", "Lab5", "Lab11", "Lab9", "Lab10"]),
        ("CSC322", "Cloud Architecture and Computing", "Computer Science", date(2026, 11, 8), time(15, 15), time(16, 0), 35,
         ["Lab8"]),

        # --- Monday 9-11-2026 ---
        ("AI216", "Machine Learning and Pattern Recognition", "Artificial Intelligence", date(2026, 11, 9), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI216", "Machine Learning and Pattern Recognition (Gr 2)", "Artificial Intelligence", date(2026, 11, 9), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI216", "Machine Learning and Pattern Recognition (Gr 3)", "Artificial Intelligence", date(2026, 11, 9), time(11, 15), time(12, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI 411", "Principles and Design of IoT Systems", "Artificial Intelligence", date(2026, 11, 9), time(12, 15), time(13, 0), 221,
         ["Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab10", "Lab11"]),
        ("BIO413", "Genomics and Proteomics", "Bioinformatics", date(2026, 11, 9), time(13, 15), time(14, 0), 123,
         ["Lab1", "Lab2", "Lab3", "Lab6"]),
        ("SEC411", "Foundations of Cyber Security", "Cybersecurity", date(2026, 11, 9), time(14, 15), time(15, 0), 228,
         ["Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab8", "Lab9"]),

        # --- Tuesday 10-11-2026 ---
        ("BAS114", "Physics", "Basic Sciences", date(2026, 11, 10), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS114", "Physics (Group 2)", "Basic Sciences", date(2026, 11, 10), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS114", "Physics (Group 3)", "Basic Sciences", date(2026, 11, 10), time(11, 15), time(12, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("CSC312", "Computer Security and Cryptography", "Cybersecurity", date(2026, 11, 10), time(13, 15), time(14, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("CSC312", "Computer Security and Cryptography (Gr 2)", "Cybersecurity", date(2026, 11, 10), time(14, 15), time(15, 0), 159,
         ["Lab5", "Lab6", "Lab7", "Lab8"]),
        ("AI127", "Introduction to Artificial Intelligence", "Artificial Intelligence", date(2026, 11, 10), time(14, 15), time(15, 0), 52,
         ["Lab3", "Lab4"]),

        # --- Wednesday 11-11-2026 ---
        ("AI215", "Digital Logic Design", "Artificial Intelligence", date(2026, 11, 11), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI215", "Digital Logic Design (Group 2)", "Artificial Intelligence", date(2026, 11, 11), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI215", "Digital Logic Design (Group 3)", "Artificial Intelligence", date(2026, 11, 11), time(11, 15), time(12, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI 412", "Theory of Automata and Formal Languages", "Artificial Intelligence", date(2026, 11, 11), time(13, 15), time(14, 0), 218,
         ["Lab3", "Lab4", "Lab5", "Lab8", "Lab7", "Lab10", "Lab11"]),
        ("SEC413", "Network Visualization and Vulnerability Detection", "Cybersecurity", date(2026, 11, 11), time(15, 15), time(16, 0), 225,
         ["Lab2", "Lab3", "Lab4", "Lab6", "Lab7", "Lab10", "Lab11"]),

        # --- Thursday 12-11-2026 ---
        ("BAS116", "Basic Electricity & Electronics", "Basic Sciences", date(2026, 11, 12), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS116", "Basic Electricity & Electronics (Gr 2)", "Basic Sciences", date(2026, 11, 12), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI315", "Computational Cognitive Science", "Artificial Intelligence", date(2026, 11, 12), time(13, 15), time(14, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("GEN101", "English Language II", "Humanities", date(2026, 11, 12), time(15, 15), time(16, 0), 186,
         ["Lab5", "Lab6", "Lab7", "Lab8", "Lab9"]),

        # --- Saturday 14-11-2026 ---
        ("CSC213", "Data Mining and Exploration", "Computer Science", date(2026, 11, 14), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("CSC213", "Data Mining and Exploration (Gr 2)", "Computer Science", date(2026, 11, 14), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI424", "Deep Learning", "Artificial Intelligence", date(2026, 11, 14), time(13, 15), time(14, 0), 28,
         ["Lab4"]),

        # --- Sunday 15-11-2026 ---
        ("CSC115", "Introduction to Computer Systems", "Computer Science", date(2026, 11, 15), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("CSC115", "Introduction to Computer Systems (Gr 2)", "Computer Science", date(2026, 11, 15), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),

        # --- Monday 16-11-2026 ---
        ("CSC214", "Computer Networks and Data Communication", "Computer Science", date(2026, 11, 16), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("AI 414", "Cyber-Physical Systems", "Artificial Intelligence", date(2026, 11, 16), time(12, 15), time(13, 0), 332,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10"]),

        # --- Tuesday 17-11-2026 ---
        ("BAS211", "Numerical Computation", "Basic Sciences", date(2026, 11, 17), time(9, 15), time(10, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),
        ("BAS211", "Numerical Computation (Group 2)", "Basic Sciences", date(2026, 11, 17), time(10, 15), time(11, 0), 397,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12"]),

        # --- Wednesday 18-11-2026 (Cross-Faculty Exam) ---
        ("GEN002", "English Language I", "Humanities", date(2026, 11, 18), time(11, 15), time(12, 0), 250,
         ["P1", "P2", "P3", "M1", "M2", "M3", "PT (Physical Therapy)", "Ph1", "Ph2"]),
        ("GEN002", "English Language I (Group 2)", "Humanities", date(2026, 11, 18), time(12, 15), time(13, 0), 366,
         ["B1", "B2", "E1", "E2", "E3", "E4", "P1", "P2", "P3", "PT (Physical Therapy)", "Ph1", "Ph2"]),
        ("GEN002", "English Language I (Group 3)", "Humanities", date(2026, 11, 18), time(13, 15), time(14, 0), 160,
         ["E1", "E2", "E3", "E4", "B1", "B2"]),

        # --- Thursday 19-11-2026 ---
        ("BAS212", "Operations Research", "Basic Sciences", date(2026, 11, 19), time(9, 15), time(10, 0), 270,
         ["Lab3", "Lab4", "Lab5", "Lab6", "Lab8", "Lab9", "Lab10", "Lab11"]),
        ("AIE46", "New Trends in AI", "Artificial Intelligence", date(2026, 11, 19), time(12, 15), time(13, 0), 201,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab6", "Lab7"]),
        ("SEC412", "Cyber Incident Response and Forensics", "Cybersecurity", date(2026, 11, 19), time(13, 15), time(14, 0), 231,
         ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7"]),
    ]

    # Create exam session records per venue so invigilators are placed in specific rooms!
    session_count = 0
    for ccode, cname, dept, edate, stime, etime, total_students, rooms in raw_schedule:
        per_room_students = max(1, total_students // len(rooms))
        for r in rooms:
            venue = venue_map.get(r)
            if not venue:
                continue

            session_count += 1
            # Primary room receives the Course Lead Professor (رئيس اللجنة / أستاذ المقرر)
            req_prof = 1 if r == rooms[0] else 0

            # Delta University Real-World Academic Rule:
            # Computer Labs typically require 2 invigilators (معمل حاسب آلي: مراقبان)
            # Lecture Halls require more (3 to 4 proctors depending on hall capacity)
            if venue.venue_type == VenueTypeEnum.LAB:
                req_ta = 2
            elif venue.venue_type == VenueTypeEnum.HALL:
                req_ta = 3 if venue.capacity <= 50 else 4
            else:
                req_ta = 2

            sess = ExamSession(
                course_code=ccode,
                course_name=f"{cname} — [{r}]",
                department=dept,
                date=edate,
                start_time=stime,
                end_time=etime,
                student_headcount=min(venue.capacity, per_room_students),
                venue_id=venue.id,
                required_professors=req_prof,
                required_tas=req_ta,
                status="SCHEDULED",
            )
            db.add(sess)

    # ----------------------------------------------------
    # 5. Availability Blackout Sample (Conference & Leave)
    # ----------------------------------------------------
    # Assoc. Prof. Dr. Noha Ezzat El-Attar (Assoc. Prof) on Day 2 morning
    prof_noha = db.query(User).filter(User.staff_id == "DU-AI-063").first()
    if prof_noha:
        db.add(AvailabilityConstraint(
            user_id=prof_noha.id,
            date=date(2026, 11, 8),
            start_time=time(9, 0),
            end_time=time(13, 0),
            constraint_type=ConstraintTypeEnum.UNAVAILABLE,
            reason="National Scientific Committee for Artificial Intelligence"
        ))

    # Eng. Menatallah Hazem (TA #2) has an approved academic defense
    ta_menatallah = db.query(User).filter(User.staff_id == "DU-AI-002").first()
    if ta_menatallah:
        db.add(AvailabilityConstraint(
            user_id=ta_menatallah.id,
            date=date(2026, 11, 9),
            start_time=time(12, 0),
            end_time=time(16, 0),
            constraint_type=ConstraintTypeEnum.UNAVAILABLE,
            reason="Master's Thesis Proposal Defense"
        ))

    db.commit()
    print(f"Successfully seeded Delta University Faculty of AI dataset: {len(official_advisors) + 2} staff, {len(venue_map)} venues, {session_count} room sessions!")
