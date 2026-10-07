import io
from typing import Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class UniversityPDFExporter:
    """
    Generates official, submission-ready PDF examination papers
    conforming to Indian Autonomous University and OBE accreditation standards.
    """

    @classmethod
    def generate_pdf(cls, paper_data: Dict[str, Any]) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom Typography Styles
        title_style = ParagraphStyle(
            'ExamTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            alignment=1, # Center
            leading=15,
            textColor=colors.black
        )

        subtitle_style = ParagraphStyle(
            'ExamSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            alignment=1,
            leading=13,
            textColor=colors.HexColor('#1e293b')
        )

        meta_style = ParagraphStyle(
            'ExamMeta',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            alignment=1,
            leading=12
        )

        section_hdr_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            alignment=1,
            leading=12,
            textColor=colors.HexColor('#0f172a')
        )

        cell_text_style = ParagraphStyle(
            'CellText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11.5
        )

        cell_center_bold = ParagraphStyle(
            'CellCenterBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            alignment=1,
            leading=11
        )

        story = []

        # Top Bar: Paper Code & Hall Ticket Box
        paper_code = paper_data.get('paper_code', 'QP-EXAM-001')
        top_table_data = [
            [
                Paragraph(f"<b>QP CODE:</b> {paper_code}", cell_text_style),
                Paragraph("<b>REGISTER / ROLL NO:</b>", cell_text_style),
                Table([[""] * 10], colWidths=[14]*10, rowHeights=[14], style=[
                    ('GRID', (0,0), (-1,-1), 1, colors.black),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ])
            ]
        ]
        top_table = Table(top_table_data, colWidths=[180, 140, 190])
        top_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (2,0), (2,0), 'RIGHT'),
        ]))
        story.append(top_table)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceAfter=8))

        # Institution & Exam Header
        story.append(Paragraph("AUTONOMOUS INSTITUTION • AFFILIATED TO UNIVERSITY", title_style))
        story.append(Paragraph(paper_data.get('department', 'DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING').upper(), subtitle_style))
        story.append(Paragraph(f"{paper_data.get('semester_label', 'B.TECH').upper()} END SEMESTER EXAMINATIONS • {paper_data.get('academic_year', '2025-2026')}", meta_style))
        
        subj_line = f"<b>{paper_data.get('subject_code', 'SUB101')} - {paper_data.get('subject_name', 'COURSE TITLE').upper()}</b> (Regulation: {paper_data.get('regulation', 'Autonomous')})"
        story.append(Paragraph(subj_line, meta_style))
        story.append(Spacer(1, 6))

        # Time & Max Marks Bar
        time_marks_data = [
            [
                Paragraph(f"<b>TIME ALLOWED:</b> {paper_data.get('duration_minutes', 180)} MINUTES (3 HOURS)", cell_text_style),
                Paragraph(f"<b>MAXIMUM MARKS:</b> {paper_data.get('total_marks', 70)} MARKS", ParagraphStyle('RightMeta', parent=cell_text_style, alignment=2))
            ]
        ]
        tm_table = Table(time_marks_data, colWidths=[255, 255])
        tm_table.setStyle(TableStyle([
            ('LINEABOVE', (0,0), (-1,-1), 1, colors.black),
            ('LINEBELOW', (0,0), (-1,-1), 1, colors.black),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(tm_table)
        story.append(Spacer(1, 6))

        # Instructions Box
        instr_p = Paragraph(
            "<b>General Instructions:</b> 1. Answer ALL questions in PART - A. "
            "2. Answer EITHER (a) OR (b) from each question in PART - B. "
            "3. [CO] = Course Outcome, [BL] = Bloom's Taxonomy Level (L1: Remember, L2: Understand, L3: Apply, L4: Analyze, L5: Evaluate, L6: Create).",
            ParagraphStyle('Instr', parent=cell_text_style, fontSize=7.5, leading=10, textColor=colors.HexColor('#334155'))
        )
        story.append(instr_p)
        story.append(Spacer(1, 8))

        # Sections & Tables
        for sec in paper_data.get('sections', []):
            sec_header = f"<b>{sec.get('name', 'SECTION')}</b> — {sec.get('description', '')}"
            story.append(Paragraph(sec_header, section_hdr_style))
            story.append(Spacer(1, 4))

            # Table Header
            table_rows = [
                [
                    Paragraph("<b>Q.No</b>", cell_center_bold),
                    Paragraph("<b>Question Description</b>", cell_center_bold),
                    Paragraph("<b>CO</b>", cell_center_bold),
                    Paragraph("<b>BL</b>", cell_center_bold),
                    Paragraph("<b>Marks</b>", cell_center_bold)
                ]
            ]

            table_styles = [
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#475569')),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 4),
                ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ]

            current_row_idx = 1
            for q in sec.get('questions', []):
                if q.get('choice_option') == 'B':
                    # Add an (OR) row spanning across columns
                    table_rows.append([
                        "",
                        Paragraph("<b>( OR )</b>", ParagraphStyle('OrStyle', parent=cell_center_bold, textColor=colors.HexColor('#b45309'))),
                        "", "", ""
                    ])
                    table_styles.append(('SPAN', (1, current_row_idx), (1, current_row_idx)))
                    table_styles.append(('BACKGROUND', (0, current_row_idx), (-1, current_row_idx), colors.HexColor('#f8fafc')))
                    current_row_idx += 1

                q_text = q.get('question_text', '')
                if q.get('question_type') == 'MCQ' and q.get('options'):
                    try:
                        import json
                        opts = json.loads(q['options']) if isinstance(q['options'], str) else q['options']
                        opts_lines = []
                        for k in ['A', 'B', 'C', 'D']:
                            if k in opts:
                                opts_lines.append(f"<b>({k})</b> {opts[k]}")
                        if opts_lines:
                            q_text += "<br/><font color='#334155'>" + "&nbsp;&nbsp;&nbsp;&nbsp;".join(opts_lines) + "</font>"
                    except Exception:
                        pass

                table_rows.append([
                    Paragraph(q.get('q_number', 'Q'), cell_center_bold),
                    Paragraph(q_text, cell_text_style),
                    Paragraph(q.get('co_code', 'CO1'), cell_center_bold),
                    Paragraph(q.get('bloom_level', 'L2'), cell_center_bold),
                    Paragraph(str(q.get('marks', 2)), cell_center_bold)
                ])
                current_row_idx += 1

            # Printable width: 510 pt
            q_table = Table(table_rows, colWidths=[35, 365, 35, 35, 40])
            q_table.setStyle(TableStyle(table_styles))
            story.append(q_table)
            story.append(Spacer(1, 10))

        # Bottom Signatures
        story.append(Spacer(1, 15))
        sig_data = [
            [
                Paragraph("___________________________<br/><b>Course Coordinator</b>", cell_center_bold),
                Paragraph("___________________________<br/><b>Head of Department (HOD)</b>", cell_center_bold),
                Paragraph("___________________________<br/><b>Controller of Examinations</b>", cell_center_bold)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[170, 170, 170])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ]))
        story.append(KeepTogether([sig_table]))

        doc.build(story)
        buffer.seek(0)
        return buffer
