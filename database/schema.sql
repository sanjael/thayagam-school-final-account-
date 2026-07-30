-- ============================================================
-- School Fee Management System — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS school_fee_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE school_fee_system;

-- ------------------------------------------------------------
-- 1. users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(100) NOT NULL UNIQUE,
  email       VARCHAR(150) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  role        ENUM('admin', 'accountant', 'principal') NOT NULL DEFAULT 'accountant',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. classes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,   -- e.g. "5A", "9B"
  section     VARCHAR(10),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  admission_no  VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  class_id      INT NOT NULL,
  gender        ENUM('male', 'female', 'other'),
  dob           DATE,
  parent_name   VARCHAR(150),
  phone         VARCHAR(15),
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_admission ON students(admission_no);

-- ------------------------------------------------------------
-- 4. fee_structure
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_structure (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  class_id    INT NOT NULL,
  term        ENUM('Term 1', 'Term 2', 'Term 3') NOT NULL,
  fee_type    VARCHAR(100) NOT NULL,   -- e.g. "Tuition Fee", "Lab Fee"
  amount      DECIMAL(10, 2) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,  -- e.g. "2024-2025"
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feestr_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_fee_structure (class_id, term, fee_type, academic_year)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. fee_payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  class_id      INT NOT NULL,
  term          ENUM('Term 1', 'Term 2', 'Term 3') NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  total_fee     DECIMAL(10, 2) NOT NULL,
  amount_paid   DECIMAL(10, 2) NOT NULL,
  balance       DECIMAL(10, 2) GENERATED ALWAYS AS (total_fee - amount_paid) STORED,
  payment_date  DATE NOT NULL,
  payment_mode  ENUM('cash', 'online', 'cheque', 'dd') NOT NULL DEFAULT 'cash',
  collected_by  INT,
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_student  FOREIGN KEY (student_id)   REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_class    FOREIGN KEY (class_id)     REFERENCES classes(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_pay_user     FOREIGN KEY (collected_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_payments_student ON fee_payments(student_id);
CREATE INDEX idx_payments_term    ON fee_payments(term, academic_year);

-- ------------------------------------------------------------
-- 6. receipts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  receipt_no    VARCHAR(50) NOT NULL UNIQUE,
  payment_id    INT NOT NULL,
  issued_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipt_payment FOREIGN KEY (payment_id) REFERENCES fee_payments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. school_settings  (logo path, name, correspondent, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_settings (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  school_name         VARCHAR(200) NOT NULL,
  address             TEXT,
  phone               VARCHAR(20),
  email               VARCHAR(150),
  logo_path           VARCHAR(500),
  correspondent_name  VARCHAR(150),
  principal_name      VARCHAR(150),
  current_academic_year VARCHAR(20) NOT NULL DEFAULT '2024-2025',
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed: default admin user  (password: Admin@123 — bcrypt hash)
-- ------------------------------------------------------------
INSERT INTO users (username, email, hashed_password, role)
VALUES ('admin', 'admin@school.com',
  '$2b$12$KIXuHBLVn4z8..Xld1b4YOZUMWTFijOehtMLHSUiI3YVhIbG0kQXO',
  'admin')
ON DUPLICATE KEY UPDATE username = username;

-- Seed: default school settings
INSERT INTO school_settings (school_name, address, phone, correspondent_name, principal_name)
VALUES ('Sri Thayagam Matriculation School',
        '123, Main Road, Tamil Nadu',
        '9876543210',
        'Correspondent Name',
        'Principal Name')
ON DUPLICATE KEY UPDATE school_name = school_name;
