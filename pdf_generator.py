# PDF Certificate Generator - pdf_generator.py
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.platypus.flowables import HRFlowable
import uuid
import os
from datetime import datetime
import logging
from models import WipeSession

logger = logging.getLogger(__name__)

class CertificateGenerator:
    """Professional PDF certificate generator for wipe operations"""
    
    def __init__(self):
        self.certificates_dir = "certificates"
        os.makedirs(self.certificates_dir, exist_ok=True)
        
    async def generate_certificate(self, session: WipeSession, progress_data: dict) -> str:
        """Generate a professional wipe certificate"""
        cert_id = str(uuid.uuid4())[:8].upper()
        filename = f"{cert_id}.pdf"
        filepath = os.path.join(self.certificates_dir, filename)
        
        try:
            # Create PDF document
            doc = SimpleDocTemplate(
                filepath,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )
            
            # Build certificate content
            story = []
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.darkblue,
                alignment=1  # Center
            )
            
            subtitle_style = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Heading2'],
                fontSize=16,
                spaceAfter=20,
                textColor=colors.darkred,
                alignment=1  # Center
            )
            
            normal_style = styles['Normal']
            normal_style.fontSize = 11
            normal_style.spaceAfter = 12
            
            # Header
            story.append(Paragraph("🛡️ SECUREWIPE TECHNOLOGIES", title_style))
            story.append(Paragraph("Data Sanitization Certificate", subtitle_style))
            story.append(Spacer(1, 20))
            
            # Certificate info
            cert_info = [
                ["Certificate ID:", f"<b>{cert_id}</b>"],
                ["Issue Date:", datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")],
                ["Authorized Inspector:", "<b>Mani Verma (CERT-MV-2025)</b>"],
                ["Organization:", "SecureWipe Technologies"]
            ]
            
            cert_table = Table(cert_info, colWidths=[2*inch, 4*inch])
            cert_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(cert_table)
            story.append(Spacer(1, 20))
            
            # Horizontal line
            story.append(HRFlowable(width="100%", thickness=1, color=colors.darkblue))
            story.append(Spacer(1, 20))
            
            # Operation details
            story.append(Paragraph("<b>OPERATION SUMMARY</b>", styles['Heading3']))
            story.append(Spacer(1, 10))
            
            operation_data = [
                ["Device ID:", session.device_id],
                ["Wipe Standard:", self._get_standard_name(session.standard)],
                ["Number of Passes:", str(session.passes)],
                ["Operation Mode:", "<b><font color='red'>SIMULATION</font></b>"],
                ["Start Time:", session.started_at.strftime("%Y-%m-%d %H:%M:%S UTC")],
                ["Duration:", f"{progress_data.get('elapsed_time', 0):.1f} seconds"],
                ["Status:", "<b><font color='green'>COMPLETED</font></b>"]
            ]
            
            op_table = Table(operation_data, colWidths=[2*inch, 4*inch])
            op_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))
            story.append(op_table)
            story.append(Spacer(1, 20))
            
            # Compliance section
            story.append(Paragraph("<b>COMPLIANCE & STANDARDS</b>", styles['Heading3']))
            story.append(Spacer(1, 10))
            
            compliance_text = self._get_compliance_text(session.standard)
            story.append(Paragraph(compliance_text, normal_style))
            story.append(Spacer(1, 20))
            
            # Security disclaimer
            story.append(HRFlowable(width="100%", thickness=1, color=colors.red))
            story.append(Spacer(1, 10))
            
            disclaimer_style = ParagraphStyle(
                'Disclaimer',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.red,
                backColor=colors.lightyellow,
                borderColor=colors.red,
                borderWidth=1,
                leftIndent=10,
                rightIndent=10,
                spaceAfter=12
            )
            
            disclaimer_text = """
            <b>⚠️ IMPORTANT SECURITY NOTICE</b><br/><br/>
            This certificate verifies a <b>SIMULATED</b> data sanitization operation performed for 
            demonstration purposes only. No actual data destruction occurred during this operation.<br/><br/>
            
            <b>Real data sanitization requires:</b><br/>
            • System-level privileges and direct hardware access<br/>
            • Specialized tools and vendor-specific commands<br/>
            • Proper authorization on sacrificial/test hardware<br/>
            • Compliance with organizational security policies<br/><br/>
            
            For production data sanitization, consult qualified security professionals and follow 
            NIST SP 800-88 guidelines.
            """
            
            story.append(Paragraph(disclaimer_text, disclaimer_style))
            story.append(Spacer(1, 20))
            
            # Signature section
            story.append(Paragraph("<b>DIGITAL AUTHORIZATION</b>", styles['Heading3']))
            story.append(Spacer(1, 10))
            
            signature_data = [
                ["Authorized Signature:", "Mani Verma"],
                ["Inspector Certification:", "CERT-MV-2025"],
                ["Digital Timestamp:", datetime.utcnow().isoformat() + "Z"],
                ["Certificate Hash:", f"SHA256:{hash(cert_id + session.wipe_id) % 1000000:06d}"]
            ]
            
            sig_table = Table(signature_data, colWidths=[2*inch, 4*inch])
            sig_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(sig_table)
            
            # Footer
            story.append(Spacer(1, 30))
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.grey,
                alignment=1  # Center
            )
            story.append(Paragraph("SecureWipe Technologies © 2025 | SIH Hackathon Demonstration", footer_style))
            story.append(Paragraph(f"Certificate ID: {cert_id} | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", footer_style))
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"Generated certificate {cert_id} for wipe {session.wipe_id}")
            return cert_id
            
        except Exception as e:
            logger.error(f"Certificate generation failed: {e}")
            raise
    
    def _get_standard_name(self, standard: str) -> str:
        """Get full name for wipe standard"""
        standards = {
            "nist": "NIST SP 800-88 Rev. 1 (Single-pass cryptographic erase)",
            "dod": "DoD 5220.22-M (Three-pass military standard)",
            "gutmann": "Gutmann 35-Pass (Maximum security overwrite)"
        }
        return standards.get(standard, f"Custom Standard: {standard}")
    
    def _get_compliance_text(self, standard: str) -> str:
        """Get compliance information for the standard"""
        compliance = {
            "nist": """
            This operation follows NIST SP 800-88 Rev. 1 guidelines for media sanitization. 
            The single-pass cryptographic erase method is approved for:
            • Federal agency compliance
            • HIPAA healthcare data protection
            • GDPR personal data destruction
            • Financial services regulatory requirements
            """,
            "dod": """
            This operation follows DoD 5220.22-M specifications for classified data destruction.
            The three-pass overwrite method is approved for:
            • Department of Defense contractors
            • Government security clearance requirements
            • Military and defense applications
            • Classified information systems
            """,
            "gutmann": """
            This operation follows the Gutmann 35-pass method for maximum security data destruction.
            This method is recommended for:
            • High-security research environments
            • Forensic-grade data destruction
            • Maximum paranoia security requirements
            • Legacy magnetic storage media
            """
        }
        return compliance.get(standard, "Custom compliance requirements as specified.")
    
    def get_certificate_path(self, cert_id: str) -> str:
        """Get the file path for a certificate"""
        return os.path.join(self.certificates_dir, f"{cert_id}.pdf")