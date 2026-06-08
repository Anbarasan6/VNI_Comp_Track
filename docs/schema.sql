-- ============================================================
-- VNI Complimentary Copy Tracking System — PostgreSQL Schema
-- ============================================================

-- Enable UUID extension (optional, we use SERIAL for simplicity)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    email       VARCHAR(200) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('sales_rep', 'manager', 'admin')),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PROFESSORS
-- ============================================================
CREATE TABLE IF NOT EXISTS professors (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(10) NOT NULL CHECK (title IN ('Mr', 'Mrs', 'Dr', 'Prof')),
    initial         VARCHAR(20),
    name            VARCHAR(200) NOT NULL,
    designation     VARCHAR(200),
    department      VARCHAR(200),
    university      VARCHAR(300),
    college_name    VARCHAR(300) NOT NULL,

    address_line_1  TEXT,
    address_line_2  TEXT,
    city            VARCHAR(100),
    pincode         VARCHAR(10),

    mobile          VARCHAR(15),
    email           VARCHAR(200),

    sales_person_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professors_college ON professors(college_name);
CREATE INDEX IF NOT EXISTS idx_professors_dept ON professors(department);
CREATE INDEX IF NOT EXISTS idx_professors_city ON professors(city);
CREATE INDEX IF NOT EXISTS idx_professors_sales_person ON professors(sales_person_id);

-- ============================================================
-- BOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
    id          SERIAL PRIMARY KEY,
    book_code   VARCHAR(50) UNIQUE NOT NULL,
    title       VARCHAR(400) NOT NULL,
    author_name VARCHAR(300) NOT NULL,
    edition     VARCHAR(50),
    status      VARCHAR(10) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
    id              SERIAL PRIMARY KEY,
    request_no      VARCHAR(20) UNIQUE NOT NULL,  -- REQ-2026-0001
    professor_id    INTEGER NOT NULL REFERENCES professors(id) ON DELETE RESTRICT,
    delivery_type   VARCHAR(20) NOT NULL CHECK (delivery_type IN ('HAND_DELIVERY', 'OFFICE_DISPATCH')),
    address_type    VARCHAR(15) NOT NULL CHECK (address_type IN ('COLLEGE', 'RESIDENTIAL')),
    remarks         TEXT,
    status          VARCHAR(15) DEFAULT 'REQUESTED'
                    CHECK (status IN ('REQUESTED','APPROVED','DISPATCHED','DELIVERED','REJECTED')),
    created_by      INTEGER NOT NULL REFERENCES users(id),
    approved_by     INTEGER REFERENCES users(id),
    approved_at     TIMESTAMP,
    dispatch_date   TIMESTAMP,
    delivery_date   TIMESTAMP,
    letter_content  TEXT,   -- stores edited letter HTML
    rejection_reason TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_professor ON requests(professor_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_requests_delivery_type ON requests(delivery_type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

-- ============================================================
-- REQUEST BOOKS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS request_books (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    copies      INTEGER NOT NULL DEFAULT 1 CHECK (copies > 0),
    UNIQUE (request_id, book_id)
);

-- ============================================================
-- FACULTY INFORMATION FORM (public submission)
-- ============================================================
CREATE TABLE IF NOT EXISTS faculty_info (
    id                  SERIAL PRIMARY KEY,
    professor_name      VARCHAR(200) NOT NULL,
    college_name        VARCHAR(300) NOT NULL,
    department          VARCHAR(200),
    subjects_handling   TEXT,
    student_strength    INTEGER,
    current_textbook    TEXT,
    current_publisher   VARCHAR(200),
    remarks             TEXT,
    mobile              VARCHAR(15) UNIQUE NOT NULL,  -- unique deduplication key
    request_ref         VARCHAR(20),                  -- optional REQ-XXXX ref from email link
    submitted_at        TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- REQUEST NUMBER SEQUENCE HELPER (used by application)
-- ============================================================
-- Application generates: REQ-{YEAR}-{seq padded to 4 digits}
-- Sequence is tracked in application logic using MAX(request_no) per year

-- ============================================================
-- INITIAL SEED — default admin user
-- (password: Admin@123, hashed via bcrypt)
-- Run seed.py instead of this directly
-- ============================================================

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_request_summary AS
SELECT
    r.id,
    r.request_no,
    r.delivery_type,
    r.address_type,
    r.status,
    r.remarks,
    r.dispatch_date,
    r.delivery_date,
    r.created_at,
    r.rejection_reason,
    p.id            AS professor_id,
    p.title         AS prof_title,
    p.name          AS prof_name,
    p.college_name,
    p.department,
    p.mobile        AS prof_mobile,
    p.email         AS prof_email,
    p.city,
    p.address_line_1,
    p.address_line_2,
    p.pincode,
    u.id            AS sales_rep_id,
    u.name          AS sales_rep_name,
    u.email         AS sales_rep_email
FROM requests r
JOIN professors p ON r.professor_id = p.id
JOIN users u ON r.created_by = u.id;
