import sqlite3
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATABASE_DIR = Path(__file__).resolve().parent

DB_PATH = BACKEND_DIR / "flowsync.db"
SCHEMA_PATH = DATABASE_DIR / "schema.sql"
SEED_PATH = DATABASE_DIR / "seed.sql"


def seed_database():
    if not DB_PATH.exists():
        print("Database file not found. Creating database from schema first.")
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

        connection = sqlite3.connect(DB_PATH)
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(schema_sql)
        connection.commit()
        connection.close()

    seed_sql = SEED_PATH.read_text(encoding="utf-8")

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(seed_sql)
    connection.commit()
    connection.close()

    print("Seed data inserted successfully.")


if __name__ == "__main__":
    seed_database()