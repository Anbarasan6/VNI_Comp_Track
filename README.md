# VNI Complimentary Copy Tracking System

A production-ready web application for VNI Publications to manage complimentary book copies sent to professors and faculty.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Bootstrap 5 |
| Backend | Python FastAPI + SQLAlchemy |
| Database | PostgreSQL (local or Supabase) |
| Auth | JWT + Role-Based Access Control |
| Email | Gmail SMTP |
| Letter | Quill.js WYSIWYG + PDF + .docx export |

## User Roles

- **Sales Rep** — Create requests, track own submissions
- **Manager** — Approve/reject requests, view all tracking
- **Admin** — Full access: letters, dispatch, reports, master data

## Quick Start

```powershell
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # Edit with your credentials
python seed.py           # Creates default admin
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

See [docs/INSTALL.md](docs/INSTALL.md) for full setup instructions.

## Default Admin Login

- Email: `admin@vni.com`  
- Password: `Admin@123`

## Project Structure

```
VNI_Comp_Track/
├── backend/          # FastAPI Python backend
├── frontend/         # React + Vite frontend  
└── docs/             # Schema + install guide
```
