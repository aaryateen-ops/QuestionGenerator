import sqlite3
import os
import logging

logger = logging.getLogger("qp_system.migrations")

def run_migrations(db_path: str = "qp_system.db"):
    """
    Performs safe, idempotent schema migrations on the SQLite database
    without destroying existing data or seed questions.
    """
    if not os.path.exists(db_path):
        return

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # 1. Migrate questions table
        cur.execute("PRAGMA table_info(questions)")
        q_cols = {r[1] for r in cur.fetchall()}

        if "question_type" not in q_cols:
            logger.info("Migrating questions: adding question_type column...")
            cur.execute("ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'SHORT'")
            # Backfill legacy questions based on marks weightage
            cur.execute("UPDATE questions SET question_type = 'SHORT' WHERE marks <= 5")
            cur.execute("UPDATE questions SET question_type = 'LONG' WHERE marks > 5")

        if "options" not in q_cols:
            logger.info("Migrating questions: adding options column...")
            cur.execute("ALTER TABLE questions ADD COLUMN options TEXT DEFAULT NULL")

        if "correct_answer" not in q_cols:
            logger.info("Migrating questions: adding correct_answer column...")
            cur.execute("ALTER TABLE questions ADD COLUMN correct_answer VARCHAR(50) DEFAULT NULL")

        # 2. Migrate syllabus_units table
        cur.execute("PRAGMA table_info(syllabus_units)")
        unit_cols = {r[1] for r in cur.fetchall()}

        if "topics" not in unit_cols:
            logger.info("Migrating syllabus_units: adding topics column...")
            cur.execute("ALTER TABLE syllabus_units ADD COLUMN topics TEXT DEFAULT NULL")

        # 3. Migrate users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                role VARCHAR(50) DEFAULT 'FACULTY',
                department VARCHAR(100),
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_users_role ON users (role)")

        conn.commit()
        conn.close()
        logger.info("Database migrations applied and verified successfully.")
    except Exception as e:
        logger.error(f"Database migration exception: {e}", exc_info=True)
