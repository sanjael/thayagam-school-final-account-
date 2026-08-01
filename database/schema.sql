-- ============================================================
-- School Fee Management System — PostgreSQL / Supabase Schema
-- Database: PostgreSQL (Supabase)
-- ============================================================

-- ------------------------------------------------------------
-- Custom ENUM types
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role    AS ENUM ('admin', 'accountant', 'principal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_type  AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE term_type    AS ENUM ('Term 1', 'Term 2', 'Term 3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('cash', 'online', 'cheque', 'dd');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- Helper: auto-update "updated_at" columns via trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  username        VARCHAR(100)  NOT NULL UNIQUE,
  email           VARCHAR(150)  NOT NULL UNIQUE,
  hashed_password VARCHAR(255)  NOT NULL,
  role            user_role     NOT NULL DEFAULT 'accountant',
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
    )
  );

-- ============================================================
-- 2. classes
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  section    VARCHAR(10),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read classes"
  ON classes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage classes"
  ON classes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
    )
  );

-- ============================================================
-- 3. students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id           BIGSERIAL PRIMARY KEY,
  admission_no VARCHAR(50)  NOT NULL UNIQUE,
  name         VARCHAR(150) NOT NULL,
  class_id     BIGINT       NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  gender       gender_type,
  dob          DATE,
  parent_name  VARCHAR(150),
  phone        VARCHAR(15),
  address      TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_name      ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_class     ON students(class_id);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read students"
  ON students FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and accountants can manage students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('admin', 'accountant')
    )
  );

-- ============================================================
-- 4. fee_structure
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_structure (
  id            BIGSERIAL PRIMARY KEY,
  class_id      BIGINT         NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term          term_type      NOT NULL,
  fee_type      VARCHAR(100)   NOT NULL,
  amount        NUMERIC(10, 2) NOT NULL,
  academic_year VARCHAR(20)    NOT NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_fee_structure UNIQUE (class_id, term, fee_type, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_class ON fee_structure(class_id);

ALTER TABLE fee_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fee_structure"
  ON fee_structure FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage fee_structure"
  ON fee_structure FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
    )
  );

-- ============================================================
-- 5. fee_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_payments (
  id            BIGSERIAL PRIMARY KEY,
  student_id    BIGINT         NOT NULL REFERENCES students(id)  ON DELETE RESTRICT,
  class_id      BIGINT         NOT NULL REFERENCES classes(id)   ON DELETE RESTRICT,
  term          term_type      NOT NULL,
  academic_year VARCHAR(20)    NOT NULL,
  total_fee     NUMERIC(10, 2) NOT NULL,
  amount_paid   NUMERIC(10, 2) NOT NULL,
  balance       NUMERIC(10, 2) GENERATED ALWAYS AS (total_fee - amount_paid) STORED,
  payment_date  DATE           NOT NULL,
  payment_mode  payment_mode   NOT NULL DEFAULT 'cash',
  collected_by  BIGINT         REFERENCES users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_term    ON fee_payments(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_payments_class   ON fee_payments(class_id);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fee_payments"
  ON fee_payments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and accountants can manage fee_payments"
  ON fee_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('admin', 'accountant')
    )
  );

-- ============================================================
-- 6. receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id         BIGSERIAL PRIMARY KEY,
  receipt_no VARCHAR(50)  NOT NULL UNIQUE,
  payment_id BIGINT       NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
  issued_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_payment ON receipts(payment_id);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read receipts"
  ON receipts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and accountants can manage receipts"
  ON receipts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('admin', 'accountant')
    )
  );

-- ============================================================
-- 7. school_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS school_settings (
  id                    BIGSERIAL PRIMARY KEY,
  school_name           VARCHAR(200) NOT NULL,
  address               TEXT,
  phone                 VARCHAR(20),
  email                 VARCHAR(150),
  logo_path             VARCHAR(500),
  correspondent_name    VARCHAR(150),
  principal_name        VARCHAR(150),
  current_academic_year VARCHAR(20)  NOT NULL DEFAULT '2024-2025',
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_school_settings_updated_at
  BEFORE UPDATE ON school_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read school_settings"
  ON school_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage school_settings"
  ON school_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
    )
  );

-- ============================================================
-- Seed: Default Admin User (username: admin / password: Admin@123)
-- ============================================================
INSERT INTO users (username, email, hashed_password, role)
VALUES (
  'admin',
  'admin@school.com',
  '$2b$12$KIXuHBLVn4z8..Xld1b4YOZUMWTFijOehtMLHSUiI3YVhIbG0kQXO',
  'admin'
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Seed: Default School Classes (LKG, UKG, Class 1 to 12)
-- ============================================================
INSERT INTO classes (name) VALUES 
('LKG'), ('UKG'), ('Class 1'), ('Class 2'), ('Class 3'), ('Class 4'), ('Class 5'),
('Class 6'), ('Class 7'), ('Class 8'), ('Class 9'), ('Class 10'), ('Class 11'), ('Class 12')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Seed: Default School Settings
-- ============================================================
INSERT INTO school_settings (school_name, address, phone, correspondent_name, principal_name)
VALUES (
  'Sri Thayagam Matriculation School',
  '123, Main Road, Tamil Nadu',
  '9876543210',
  'Correspondent Name',
  'Principal Name'
)
ON CONFLICT DO NOTHING;
