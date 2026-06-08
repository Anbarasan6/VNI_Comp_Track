import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict
from app.config import settings

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USERNAME}>"
    msg["To"] = to_email

    part = MIMEText(html_body, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USERNAME, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise


def _format_books_html(books_list: List[Dict]) -> str:
    items = []
    for book in books_list:
        title = book.get("title", "")
        author = book.get("author", "")
        copies = book.get("copies", 1)
        if copies > 1:
            items.append(f"<li><strong>{title}</strong> &ndash; {author} ({copies} Copies)</li>")
        else:
            items.append(f"<li><strong>{title}</strong> &ndash; {author}</li>")
    return "<ul>" + "".join(items) + "</ul>"


def send_dispatch_email(
    professor_email: str,
    professor_name: str,
    request_no: str,
    books_list: List[Dict],
) -> None:
    books_html = _format_books_html(books_list)
    subject = f"Complimentary Books Dispatched – {request_no} | VNI Publications"
    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Books Dispatched</title>
  <style>
    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
    .container {{ max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
    .header {{ background-color: #1a3a5c; color: #ffffff; padding: 28px 32px; }}
    .header h1 {{ margin: 0; font-size: 22px; letter-spacing: 0.5px; }}
    .header p {{ margin: 4px 0 0; font-size: 13px; opacity: 0.85; }}
    .body {{ padding: 32px; color: #333333; font-size: 15px; line-height: 1.7; }}
    .body h2 {{ color: #1a3a5c; margin-top: 0; font-size: 18px; }}
    .ref-box {{ background: #f0f5ff; border-left: 4px solid #1a3a5c; padding: 10px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }}
    .books-section {{ background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }}
    .books-section h3 {{ margin: 0 0 10px; font-size: 15px; color: #1a3a5c; }}
    ul {{ margin: 0; padding-left: 20px; }}
    li {{ margin-bottom: 6px; }}
    .footer {{ background: #f0f0f0; padding: 18px 32px; font-size: 12px; color: #666; text-align: center; }}
    .footer a {{ color: #1a3a5c; text-decoration: none; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VNI Publications</h1>
      <p>Complimentary Copy Tracking System</p>
    </div>
    <div class="body">
      <h2>Your Complimentary Books Have Been Dispatched!</h2>
      <p>Dear <strong>{professor_name}</strong>,</p>
      <p>We are pleased to inform you that your complimentary book copies have been dispatched and are on their way to you.</p>
      <div class="ref-box">
        <strong>Request Reference:</strong> {request_no}
      </div>
      <div class="books-section">
        <h3>Books Dispatched:</h3>
        {books_html}
      </div>
      <p>Please expect delivery within 5–7 business days. If you have any questions or concerns about your shipment, please contact us.</p>
      <p>Thank you for your continued association with VNI Publications.</p>
      <p>Warm regards,<br/><strong>PK Madhavan</strong><br/>Managing Director<br/>VNI Publications</p>
    </div>
    <div class="footer">
      &copy; {2026} VNI Publications. All rights reserved.
    </div>
  </div>
</body>
</html>
"""
    _send_email(professor_email, subject, html_body)


def send_delivery_email(
    professor_email: str,
    professor_name: str,
    request_no: str,
    books_list: List[Dict],
    faculty_form_url: str,
) -> None:
    books_html = _format_books_html(books_list)
    subject = f"Complimentary Books Delivered – {request_no} | VNI Publications"
    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Books Delivered</title>
  <style>
    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
    .container {{ max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
    .header {{ background-color: #1a3a5c; color: #ffffff; padding: 28px 32px; }}
    .header h1 {{ margin: 0; font-size: 22px; letter-spacing: 0.5px; }}
    .header p {{ margin: 4px 0 0; font-size: 13px; opacity: 0.85; }}
    .body {{ padding: 32px; color: #333333; font-size: 15px; line-height: 1.7; }}
    .body h2 {{ color: #1a3a5c; margin-top: 0; font-size: 18px; }}
    .ref-box {{ background: #f0f5ff; border-left: 4px solid #1a3a5c; padding: 10px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }}
    .books-section {{ background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }}
    .books-section h3 {{ margin: 0 0 10px; font-size: 15px; color: #1a3a5c; }}
    ul {{ margin: 0; padding-left: 20px; }}
    li {{ margin-bottom: 6px; }}
    .cta-btn {{ display: inline-block; background-color: #e85d04; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 16px 0; }}
    .feedback-box {{ background: #fff8f0; border: 1px solid #f4a261; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }}
    .feedback-box h3 {{ margin: 0 0 8px; color: #e85d04; font-size: 16px; }}
    .footer {{ background: #f0f0f0; padding: 18px 32px; font-size: 12px; color: #666; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VNI Publications</h1>
      <p>Complimentary Copy Tracking System</p>
    </div>
    <div class="body">
      <h2>Your Complimentary Books Have Been Delivered!</h2>
      <p>Dear <strong>{professor_name}</strong>,</p>
      <p>We are delighted to confirm that your complimentary book copies have been successfully delivered.</p>
      <div class="ref-box">
        <strong>Request Reference:</strong> {request_no}
      </div>
      <div class="books-section">
        <h3>Books Delivered:</h3>
        {books_html}
      </div>
      <p>We hope these books will be a valuable resource for your academic endeavors. We kindly request you to share your feedback by filling out a short form.</p>
      <div class="feedback-box">
        <h3>📋 Please Share Your Feedback</h3>
        <p style="margin: 0 0 12px; color: #555; font-size: 14px;">It only takes 2 minutes. Your feedback helps us serve you better!</p>
        <a class="cta-btn" href="{faculty_form_url}?ref={request_no}">Fill Faculty Info Form</a>
      </div>
      <p>Thank you for your trust in VNI Publications. We look forward to a long and fruitful academic partnership.</p>
      <p>Warm regards,<br/><strong>PK Madhavan</strong><br/>Managing Director<br/>VNI Publications</p>
    </div>
    <div class="footer">
      &copy; 2026 VNI Publications. All rights reserved.
    </div>
  </div>
</body>
</html>
"""
    _send_email(professor_email, subject, html_body)
