# VNI Complimentary Copy Tracking System
## Quick Start Guide

---

## Prerequisites

| Tool | Version | Download |
|------|---------|---------|
| Python | 3.11+ | python.org |
| Node.js | 18+ | nodejs.org |
| PostgreSQL | 14+ | postgresql.org OR use Supabase |

---

## Step 1 — Set Up PostgreSQL Database

### Option A: Local PostgreSQL
```sql
CREATE DATABASE vni_comp_track;
```

### Option B: Supabase (Free Cloud)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy the **Connection String** (Pooler → URI)
3. Use it as your `DATABASE_URL`

---

## Step 2 — Configure Backend

```powershell
cd d:\projects\VNI_Comp_Track\backend
```

Edit `.env` and set:
```ini
# Required: update with your actual database URL
DATABASE_URL=postgresql://postgres:password@localhost:5432/vni_comp_track

# Required for email: create a Gmail App Password at
# myaccount.google.com/apppasswords
SMTP_PASSWORD=your-16-char-gmail-app-password
```

---

## Step 3 — Install Backend Dependencies

```powershell
cd d:\projects\VNI_Comp_Track\backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

> **Note**: If `weasyprint` install fails on Windows, install GTK first:
> Download from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

---

## Step 4 — Initialize Database & Create Admin User

```powershell
# Make sure you are in the backend directory with venv activated
python seed.py
```

Output:
```
✓ Default admin created successfully!
  Email   : admin@vni.com
  Password: Admin@123
  Role    : admin
⚠  IMPORTANT: Change the password after first login!
```

---

## Step 5 — Start the Backend Server

```powershell
uvicorn app.main:app --reload --port 8000
```

Backend will be available at:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/docs

---

## Step 6 — Start the Frontend

Open a new terminal:
```powershell
cd d:\projects\VNI_Comp_Track\frontend
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@vni.com | Admin@123 |

> **Change the password** after first login via User Management.

---

## User Roles & Access

| Role | Access |
|------|--------|
| **Sales Rep** | Create requests, view own tracking |
| **Manager** | View/approve/reject all requests, faculty database |
| **Admin** | Full access — letters, dispatch, users, reports |

---

## Business Workflow

### Flow 1: Hand Delivery
```
Sales Rep → Create Request (Hand Delivery) → Admin marks Delivered
```

### Flow 2: Office Dispatch
```
Sales Rep → Create Request → Manager Approves/Rejects
→ Admin Opens Letter Editor → Generates Letter → Prints Letter
→ Admin Marks Dispatched (email sent) → Admin Marks Delivered (email + form link sent)
```

---

## Gmail App Password Setup

1. Go to **myaccount.google.com**
2. Security → 2-Step Verification (enable it first)
3. App passwords → Create → Name: "VNI"
4. Copy the 16-character password
5. Paste into `.env` as `SMTP_PASSWORD`

---

## CSV Import Format (Professor Master)

Download the template CSV with these columns:
```
title, initial, name, designation, department, university,
college_name, address_line_1, address_line_2, city, pincode, mobile, email
```

- `title`: Mr / Mrs / Dr / Prof
- `mobile`: Required, used as unique key

---

## Faculty Info Form (Public)

The public form URL is: `http://localhost:5173/faculty-info-form?ref=REQ-2026-0001`

This URL is automatically sent to professors via email when their books are marked as **Delivered**.
Professors can fill the form without logging in. Duplicate mobile numbers are rejected.

---

## Project Structure

```
VNI_Comp_Track/
├── backend/
│   ├── app/
│   │   ├── main.py          ← FastAPI entry point
│   │   ├── config.py        ← Settings from .env
│   │   ├── database.py      ← SQLAlchemy setup
│   │   ├── models/          ← Database models
│   │   ├── schemas/         ← Pydantic schemas
│   │   ├── routers/         ← API endpoints
│   │   ├── auth/            ← JWT + RBAC
│   │   └── services/        ← Business logic
│   ├── .env                 ← Your config (DO NOT commit)
│   ├── requirements.txt
│   └── seed.py
└── frontend/
    ├── src/
    │   ├── App.jsx          ← Main router
    │   ├── pages/           ← All pages (sales/manager/admin/public)
    │   ├── components/      ← Reusable UI components
    │   ├── auth/            ← Auth context + protected route
    │   ├── api/             ← Axios instance
    │   └── utils/           ← Formatters
    ├── index.html
    └── package.json
```
