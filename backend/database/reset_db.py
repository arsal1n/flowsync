import sqlite3
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATABASE_DIR = Path(__file__).resolve().parent

DB_PATH = BACKEND_DIR / "flowsync.db"
SCHEMA_PATH = DATABASE_DIR / "schema.sql"


def reset_database():
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Deleted existing database: {DB_PATH}")

    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(schema_sql)
    connection.commit()
    connection.close()

    print(f"Database reset successfully: {DB_PATH}")


if __name__ == "__main__":
    reset_database()