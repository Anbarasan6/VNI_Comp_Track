# VNI Complimentary Copy Tracking System
## Installation Guide

---

## Prerequisites

| Software | Version | Download |
|---|---|---|
| Python | 3.11+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 15+ | https://postgresql.org |
| Git | Any | https://git-scm.com |

---

## Step 1: PostgreSQL Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL and open pgAdmin or psql
2. Create a database:
   ```sql
   CREATE DATABASE vni_comp_track;
   ```
3. Note your connection details:
   - Host: `localhost`
   - Port: `5432`
   - Database: `vni_comp_track`
   - Username: `postgres` (or your user)
   - Password: your postgres password

Your `DATABASE_URL` will be:
```
postgresql://postgres:YOUR_PASSWORD@localhost:5432/vni_comp_track
```

### Option B: Supabase (Cloud PostgreSQL)

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (URI format)
5. Replace `[YOUR-PASSWORD]` with your project password
6. Use this as your `DATABASE_URL`

---

## Step 2: Backend Setup

```powershell
# Navigate to backend directory
cd D:\projects\VNI_Comp_Track\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt
```

### Configure Environment Variables

```powershell
# Copy example env file
copy .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/vni_comp_track
SECRET_KEY=generate-a-random-32+-char-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=anbarasanshanmugam666@gmail.com
SMTP_PASSWORD=your-gmail-app-password

SMTP_FROM_NAME=VNI Publications
FRONTEND_URL=http://localhost:5173
FACULTY_FORM_URL=http://localhost:5173/faculty-info-form
```

### Gmail App Password Setup

Gmail requires an "App Password" (not your regular password):
1. Go to https://myaccount.google.com
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords
4. Create app password for "Mail"
5. Copy the 16-character password into `SMTP_PASSWORD`

### Initialize Database & Create Admin User

```powershell
# Creates all tables and default admin user
python seed.py
```

Default admin credentials:
- Email: `admin@vni.com`
- Password: `Admin@123`
- **Change this password after first login!**

### Run Backend

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify at: http://localhost:8000/docs (Swagger UI)

---

## Step 3: Frontend Setup

```powershell
# Navigate to frontend directory
cd D:\projects\VNI_Comp_Track\frontend

# Install dependencies
npm install

# Copy env file
copy .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=VNI Publications
```

### Run Frontend

```powershell
npm run dev
```

Access at: http://localhost:5173

---

## Step 4: First Login

1. Open http://localhost:5173
2. Login with:
   - Email: `admin@vni.com`
   - Password: `Admin@123`
3. Go to User Management to create Sales Rep and Manager accounts
4. Share credentials with your team

---

## User Account Setup

### Creating Users (Admin only)
1. Login as admin
2. Go to Admin → User Management
3. Click "Add User"
4. Fill: Name, Email, Password, Role
5. Roles: `sales_rep`, `manager`, `admin`

### Role Permissions

| Feature | Sales Rep | Manager | Admin |
|---|---|---|---|
| Create Request | ✅ Own only | ❌ | ✅ |
| View Requests | ✅ Own only | ✅ All | ✅ All |
| Approve/Reject | ❌ | ✅ | ✅ |
| Generate Letter | ❌ | ❌ | ✅ |
| Dispatch/Deliver | ❌ | ❌ | ✅ |
| Professor Master | ✅ Own only | ✅ View | ✅ Full |
| Book Master | ❌ | ❌ | ✅ |
| Reports Export | ❌ | ✅ | ✅ |

---

## Importing Professors via CSV

CSV file must have these columns (header row required):
```
title,initial,name,designation,department,university,college_name,address_line_1,address_line_2,city,pincode,mobile,email
```

- `title`: Must be one of: Mr, Mrs, Dr, Prof
- `college_name`: Required
- `name`: Required
- All other fields: Optional

---

## Letter Generation

1. Go to Admin → Approval Letters
2. Find the approved OFFICE_DISPATCH request
3. Click "Open Letter Editor"
4. Letter is auto-generated with professor and book details
5. Edit any text in the editor
6. Choose action:
   - **Print**: Opens browser print dialog (letter-only, no UI chrome)
   - **Download .docx**: Saves editable Word document locally
   - **Download PDF**: Saves PDF version
   - **Save**: Saves current edits for later

---

## Production Deployment

### Backend (Linux server)
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (Build)
```bash
npm run build
# Serve dist/ folder via nginx or any static file server
```

### Environment for Production
- Set `FRONTEND_URL` and `FACULTY_FORM_URL` to your production domain
- Use a strong random `SECRET_KEY` (generate with: `python -c "import secrets; print(secrets.token_hex(32))"`)
- Use environment variables instead of `.env` file in production

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `psycopg2` install fails | Install PostgreSQL client libs: `pip install psycopg2-binary` |
| WeasyPrint install fails | Install GTK+ runtime on Windows: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer |
| SMTP auth error | Use Gmail App Password, not regular password |
| CORS error in browser | Backend must be running on port 8000 |
| Token expired | Login again; tokens expire after 8 hours |

---

## Support

For technical issues, contact your system administrator.
VNI Publications Internal System — Confidential
