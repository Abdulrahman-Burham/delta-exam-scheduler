import io
import os
import re
from datetime import datetime
from typing import List, Dict, Any

from reportlab.lib.pagesizes import letter, landscape, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.models.user import User, RoleEnum
from app.models.assignment import ScheduleAssignment, AssignmentRoleEnum
from app.models.exam import ExamSession
from app.models.venue import Venue


# ---------------------------------------------------------------------------
# Font Registration & BiDi / Arabic Reshaping Engine
# ---------------------------------------------------------------------------
try:
    import arabic_reshaper
    from bidi.algorithm import get_display as bidi_get_display
    HAS_ARABIC_SUPPORT = True
except ImportError:
    HAS_ARABIC_SUPPORT = False

SYSTEM_FONT_NAME = "Helvetica"
SYSTEM_FONT_BOLD = "Helvetica-Bold"

candidate_fonts = [
    # Prestigious Academic Arabic Fonts (Amiri - Egyptian National Library / Arabeyes)
    ("/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf", "/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Bold.ttf"),
    ("/usr/share/fonts/truetype/kacst/KacstBook.ttf", "/usr/share/fonts/truetype/kacst/KacstBook.ttf"),
    # Windows native fonts with comprehensive Arabic codepoint coverage
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
    # Linux DejaVu fallback
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]

for regular_path, bold_path in candidate_fonts:
    if os.path.exists(regular_path):
        try:
            pdfmetrics.registerFont(TTFont("UnicodeFont", regular_path))
            SYSTEM_FONT_NAME = "UnicodeFont"
            if os.path.exists(bold_path):
                pdfmetrics.registerFont(TTFont("UnicodeFont-Bold", bold_path))
                SYSTEM_FONT_BOLD = "UnicodeFont-Bold"
            else:
                SYSTEM_FONT_BOLD = "UnicodeFont"
            break
        except Exception:
            pass


def clean_pdf_text(text: str) -> str:
    """
    Safely sanitizes text for PDF rendering.
    - If Arabic characters are detected and UnicodeFont is loaded,
      reshapes ligatures and applies BiDi algorithm for correct RTL rendering.
    - If standard Helvetica is active, strips non-Latin characters to prevent black box glyph errors.
    - Escapes XML entities (&, <, >) for safe ReportLab Paragraph formatting.
    """
    if not text:
        return ""
    text_str = str(text).strip()
    has_arabic = bool(re.search(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text_str))

    if has_arabic:
        if SYSTEM_FONT_NAME == "Helvetica":
            sanitized = re.sub(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', '', text_str).strip()
            text_str = re.sub(r'\(\s*\)', '', sanitized).strip() or text_str
        elif HAS_ARABIC_SUPPORT:
            try:
                reshaped = arabic_reshaper.reshape(text_str)
                text_str = bidi_get_display(reshaped)
            except Exception:
                pass

    return text_str.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")



class ExportService:
    @staticmethod
    def generate_master_schedule_pdf(
        assignments: List[ScheduleAssignment],
        sessions: List[ExamSession],
        venues: Dict[int, Venue],
        users: Dict[int, User],
        faculty_name: str = "Delta University for Science and Technology — Faculty of Artificial Intelligence"
    ) -> bytes:
        """Generates a professional Landscape PDF for the Global Master Exam Invigilation Schedule."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=20,
            leftMargin=20,
            topMargin=25,
            bottomMargin=25
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            alignment=1, # Center
            fontName=SYSTEM_FONT_BOLD
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
            alignment=1,
            fontName=SYSTEM_FONT_NAME
        )
        cell_header_style = ParagraphStyle(
            "CellHeader",
            parent=styles["Normal"],
            fontSize=9,
            leading=11,
            textColor=colors.white,
            fontName=SYSTEM_FONT_BOLD,
            alignment=1
        )
        cell_style = ParagraphStyle(
            "CellBody",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1e293b"),
            fontName=SYSTEM_FONT_NAME
        )
        cell_bold_style = ParagraphStyle(
            "CellBodyBold",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0f172a"),
            fontName=SYSTEM_FONT_BOLD
        )

        elements = []

        # Header Block
        elements.append(Paragraph(faculty_name.upper(), title_style))
        elements.append(Paragraph(f"Official Exam Invigilation Master Timetable — Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')}", subtitle_style))
        elements.append(Spacer(1, 15))

        # Build table data
        # Group assignments by session
        session_profs: Dict[int, List[str]] = {}
        session_tas: Dict[int, List[str]] = {}
        for a in assignments:
            u = users.get(a.user_id)
            if not u:
                continue
            name_cleaned = clean_pdf_text(u.full_name)
            if a.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR:
                session_profs.setdefault(a.exam_session_id, []).append(name_cleaned)
            else:
                session_tas.setdefault(a.exam_session_id, []).append(name_cleaned)

        # Sort sessions by date and start_time
        sorted_sessions = sorted(sessions, key=lambda s: (s.date, s.start_time))

        table_data = [
            [
                Paragraph("Date", cell_header_style),
                Paragraph("Time Slot", cell_header_style),
                Paragraph("Course Code & Name", cell_header_style),
                Paragraph("Dept", cell_header_style),
                Paragraph("Venue / Hall", cell_header_style),
                Paragraph("Students", cell_header_style),
                Paragraph("Lead Professor (Head Invigilator)", cell_header_style),
                Paragraph("Assigned Teaching Assistants (TAs)", cell_header_style),
            ]
        ]

        for s in sorted_sessions:
            v = venues.get(s.venue_id)
            raw_venue = f"{v.name} ({v.building}, Fl.{v.floor})" if v else "N/A"
            venue_str = clean_pdf_text(raw_venue)
            profs_str = ", ".join(session_profs.get(s.id, [])) or "None Assigned"
            tas_str = ", ".join(session_tas.get(s.id, [])) or "None Assigned"

            date_str = s.date.strftime("%a, %b %d")
            time_str = f"{s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')}"
            course_str = f"<b>{s.course_code}</b><br/>{clean_pdf_text(s.course_name)}"
            dept_str = clean_pdf_text(s.department)

            table_data.append([
                Paragraph(date_str, cell_bold_style),
                Paragraph(time_str, cell_style),
                Paragraph(course_str, cell_style),
                Paragraph(dept_str, cell_style),
                Paragraph(venue_str, cell_style),
                Paragraph(str(s.student_headcount), cell_style),
                Paragraph(profs_str, cell_bold_style),
                Paragraph(tas_str, cell_style),
            ])

        col_widths = [65, 75, 150, 70, 110, 45, 130, 150]
        schedule_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        schedule_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")), # Dark Blue Header
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))

        elements.append(schedule_table)
        elements.append(Spacer(1, 20))

        # Signatures block
        sig_data = [
            [
                Paragraph("<b>Vice Dean for Student Affairs</b><br/>Assoc. Prof. Dr. Tarek Hassan<br/><br/>___________________________", cell_style),
                Paragraph("<b>Dean of Faculty</b><br/>Assoc. Prof. Dr. Hanaa Salem<br/><br/>___________________________", cell_style),
                Paragraph("<b>Official University Stamp</b><br/>Delta University for Science & Tech<br/><br/>[SEAL]", cell_style)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[260, 260, 260])
        sig_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(KeepTogether([sig_table]))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_personal_duty_slip_pdf(
        user: User,
        user_assignments: List[ScheduleAssignment],
        sessions: Dict[int, ExamSession],
        venues: Dict[int, Venue],
        faculty_name: str = "Delta University for Science and Technology — Faculty of Artificial Intelligence"
    ) -> bytes:
        """Generates an official Personal Duty Assignment Slip for a Professor or TA."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "SlipTitle",
            parent=styles["Heading1"],
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            alignment=1,
            fontName=SYSTEM_FONT_BOLD
        )
        body_style = ParagraphStyle(
            "SlipBody",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155"),
            fontName=SYSTEM_FONT_NAME
        )
        header_cell = ParagraphStyle(
            "SlipHeaderCell",
            parent=styles["Normal"],
            fontSize=9,
            leading=11,
            textColor=colors.white,
            fontName=SYSTEM_FONT_BOLD,
            alignment=1
        )

        elements = []

        # Faculty Header
        elements.append(Paragraph(faculty_name.upper(), title_style))
        elements.append(Paragraph("EXAM SUPERVISION & INVIGILATION DUTY SLIP", ParagraphStyle(
            "DutyHeader", parent=title_style, fontSize=12, leading=15, textColor=colors.HexColor("#2563eb")
        )))
        elements.append(Spacer(1, 10))

        # Personal Info Card
        role_label = "Lead Professor / Supervisor" if user.role == RoleEnum.PROFESSOR else "Teaching Assistant (Invigilator)"
        info_data = [
            [Paragraph(f"<b>Staff Name:</b> {clean_pdf_text(user.full_name)}", body_style),
             Paragraph(f"<b>Staff ID:</b> {clean_pdf_text(user.staff_id)}", body_style)],
            [Paragraph(f"<b>Role:</b> {role_label}", body_style),
             Paragraph(f"<b>Department:</b> {clean_pdf_text(user.department)}", body_style)],
            [Paragraph(f"<b>Email:</b> {user.email}", body_style),
             Paragraph(f"<b>Total Assigned Duties:</b> {len(user_assignments)} shift(s)", body_style)]
        ]
        info_table = Table(info_data, colWidths=[260, 260])
        info_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 15))

        # Table of assigned duties
        elements.append(Paragraph("<b>Assigned Examination Shifts:</b>", ParagraphStyle(
            "ShiftHeader", parent=styles["Heading3"], fontSize=11, leading=14, textColor=colors.HexColor("#0f172a")
        )))
        elements.append(Spacer(1, 6))

        duties_data = [
            [
                Paragraph("#", header_cell),
                Paragraph("Date", header_cell),
                Paragraph("Time Window", header_cell),
                Paragraph("Course Subject", header_cell),
                Paragraph("Venue / Room", header_cell),
                Paragraph("Duty Role", header_cell),
            ]
        ]

        # Sort assignments by session date and time
        sorted_user_assignments = sorted(
            user_assignments,
            key=lambda a: (sessions[a.exam_session_id].date, sessions[a.exam_session_id].start_time)
            if a.exam_session_id in sessions else (datetime.max.date(), datetime.max.time())
        )

        for idx, a in enumerate(sorted_user_assignments, 1):
            sess = sessions.get(a.exam_session_id)
            if not sess:
                continue
            v = venues.get(sess.venue_id)
            raw_v = f"{v.name} ({v.building})" if v else "TBD"
            venue_str = clean_pdf_text(raw_v)
            duty_role = "Lead Head Supervisor" if a.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR else "Room Invigilator"
            course_subject = f"<b>{sess.course_code}</b>: {clean_pdf_text(sess.course_name)}"

            duties_data.append([
                Paragraph(str(idx), body_style),
                Paragraph(sess.date.strftime("%A, %b %d, %Y"), body_style),
                Paragraph(f"{sess.start_time.strftime('%H:%M')} - {sess.end_time.strftime('%H:%M')}", body_style),
                Paragraph(course_subject, body_style),
                Paragraph(venue_str, body_style),
                Paragraph(duty_role, body_style),
            ])

        duties_table = Table(duties_data, colWidths=[25, 105, 85, 145, 100, 75])
        duties_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(duties_table)
        elements.append(Spacer(1, 15))

        # Instructions
        instructions = """
        <b>Important Invigilation Guidelines:</b><br/>
        1. All invigilators and supervisors must arrive at the allocated exam venue at least <b>20 minutes</b> prior to the official start time.<br/>
        2. Verify student identity cards and attendance sheets before distributing test booklets.<br/>
        3. No mobile phones or unauthorized smart devices are allowed inside the examination hall.<br/>
        4. In case of emergency or unavoidable absence, notify the Exam Control Committee at least 24 hours in advance.
        """
        elements.append(Paragraph(instructions, body_style))
        elements.append(Spacer(1, 20))

        # Signature Footer
        footer_data = [
            [
                Paragraph("<b>Staff Member Acknowledgment</b><br/><br/>Signature: _______________________<br/>Date: ____/____/2026", body_style),
                Paragraph("<b>Approved by Committee Lead</b><br/><br/>Signature: _______________________<br/>Date: ____/____/2026", body_style)
            ]
        ]
        footer_table = Table(footer_data, colWidths=[265, 265])
        elements.append(KeepTogether([footer_table]))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_ical_calendar(
        user: User,
        user_assignments: List[ScheduleAssignment],
        sessions: Dict[int, ExamSession],
        venues: Dict[int, Venue]
    ) -> str:
        """Generates standard iCalendar (.ics) format string for personal calendar sync."""
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Faculty Exam Invigilation Management System//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:Exam Duty Schedule - {user.full_name}",
        ]

        for a in user_assignments:
            sess = sessions.get(a.exam_session_id)
            if not sess:
                continue
            venue = venues.get(sess.venue_id)
            venue_name = f"{venue.name}, {venue.building}" if venue else "Exam Hall"
            
            # Format dates as YYYYMMDDTHHMMSS
            dt_start = f"{sess.date.strftime('%Y%m%d')}T{sess.start_time.strftime('%H%M%S')}"
            dt_end = f"{sess.date.strftime('%Y%m%d')}T{sess.end_time.strftime('%H%M%S')}"
            role_title = "Lead Supervisor" if a.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR else "Invigilator TA"

            summary = f"Exam Invigilation: {sess.course_code} ({venue_name})"
            description = (
                f"Course: {sess.course_name} ({sess.course_code})\\n"
                f"Department: {sess.department}\\n"
                f"Role: {role_title}\\n"
                f"Venue: {venue_name}\\n"
                f"Headcount: {sess.student_headcount} students"
            )

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:exam-invigilation-{a.id}-{sess.id}@faculty.edu",
                f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{dt_start}",
                f"DTEND:{dt_end}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                f"LOCATION:{venue_name}",
                "STATUS:CONFIRMED",
                "END:VEVENT"
            ])

        lines.append("END:VCALENDAR")
        return "\r\n".join(lines)

    @staticmethod
    def generate_roster_pdf(
        venue_name: str,
        course_name: str,
        exam_date: str,
        time_slot: str,
        students: list,
        lead_doctor: str = "أستاذ المادة",
        tas: list = None,
    ) -> bytes:
        """Generates official Faculty Attendance & Sign-in Sheet PDF for a specific room."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=0.4 * inch,
            rightMargin=0.4 * inch,
            topMargin=0.4 * inch,
            bottomMargin=0.4 * inch,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "RosterTitle",
            parent=styles["Heading1"],
            fontName=SYSTEM_FONT_BOLD,
            fontSize=13,
            leading=16,
            alignment=1,  # Center
            textColor=colors.HexColor("#0f172a"),
        )
        sub_style = ParagraphStyle(
            "RosterSub",
            parent=styles["Normal"],
            fontName=SYSTEM_FONT_NAME,
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=colors.HexColor("#475569"),
        )
        cell_style = ParagraphStyle(
            "RosterCell",
            parent=styles["Normal"],
            fontName=SYSTEM_FONT_NAME,
            fontSize=8,
            leading=10,
            alignment=1,
        )
        cell_bold = ParagraphStyle(
            "RosterCellBold",
            parent=styles["Normal"],
            fontName=SYSTEM_FONT_BOLD,
            fontSize=8,
            leading=10,
            alignment=1,
            textColor=colors.HexColor("#0f172a"),
        )

        elements = []

        # Header Titles
        h1 = clean_pdf_text("جامعة الدلتا للعلوم والتكنولوجيا — كلية الذكاء الاصطناعي")
        h2 = clean_pdf_text("كنترول الامتحانات — كشف حضور ومناداة وتوقيع الطلاب")
        elements.append(Paragraph(h1, title_style))
        elements.append(Spacer(1, 2))
        elements.append(Paragraph(h2, sub_style))
        elements.append(Spacer(1, 8))

        # Metadata Summary Card
        tas_str = ", ".join(tas) if tas else "مراقب الدور"
        meta_data = [
            [
                clean_pdf_text(f"المقرر: {course_name}"),
                clean_pdf_text(f"المكان / اللجنة: {venue_name}"),
            ],
            [
                clean_pdf_text(f"التاريخ: {exam_date}"),
                clean_pdf_text(f"الفترة الزمنية: {time_slot}"),
            ],
            [
                clean_pdf_text(f"أستاذ المادة: {lead_doctor}"),
                clean_pdf_text(f"المراقبون: {tas_str}"),
            ],
            [
                clean_pdf_text(f"إجمالي عدد الطلاب المسجلين باللجنة: {len(students)} طالب"),
                clean_pdf_text("الفصل الدراسي: خريف 2026-2027 (Midterm)"),
            ],
        ]

        meta_table = Table(
            [[Paragraph(c, cell_bold) for c in row] for row in meta_data],
            colWidths=[4.0 * inch, 3.8 * inch],
        )
        meta_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        elements.append(meta_table)
        elements.append(Spacer(1, 10))

        # Students Table
        table_headers = [
            clean_pdf_text("م"),
            clean_pdf_text("كود الطالب"),
            clean_pdf_text("اسم الطالب"),
            clean_pdf_text("توقيع الاستلام (حضور)"),
            clean_pdf_text("توقيع الانصراف"),
            clean_pdf_text("ملاحظات"),
        ]
        table_data = [[Paragraph(h, cell_bold) for h in table_headers]]

        for idx, s in enumerate(students, start=1):
            st_code = s.student.student_code if hasattr(s, "student") and s.student else str(getattr(s, "student_id", ""))
            st_name = s.student.full_name if hasattr(s, "student") and s.student else "طالب"
            row = [
                Paragraph(str(idx), cell_style),
                Paragraph(str(st_code), cell_style),
                Paragraph(clean_pdf_text(str(st_name)), cell_style),
                Paragraph("", cell_style),  # Empty for physical signature
                Paragraph("", cell_style),  # Empty for physical signature
                Paragraph(clean_pdf_text(s.notes or ""), cell_style),
            ]
            table_data.append(row)

        col_widths = [0.4 * inch, 1.1 * inch, 2.7 * inch, 1.3 * inch, 1.3 * inch, 1.0 * inch]
        student_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        student_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0284c7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ])
        )
        elements.append(student_table)
        elements.append(Spacer(1, 14))

        # Bottom Signatures Block
        sig_data = [
            [
                clean_pdf_text("مراقب اللجنة (المعيد):"),
                clean_pdf_text("أستاذ المقرر (الدكتور):"),
                clean_pdf_text("رئيس الكنترول:"),
                clean_pdf_text("عميد الكلية:"),
            ],
            [
                Paragraph("...................................", cell_style),
                Paragraph("...................................", cell_style),
                Paragraph("...................................", cell_style),
                Paragraph("...................................", cell_style),
            ],
        ]
        sig_table = Table(sig_data, colWidths=[1.95 * inch] * 4)
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elements.append(KeepTogether(sig_table))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
