import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "flowsync.db"
SCHEMA_PATH = BASE_DIR.parent / "docs" / "schema.sql"

def init_database():
    connection = sqlite3.connect(DB_PATH)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as file:
        schema = file.read()

    connection.executescript(schema)
    connection.commit()
    connection.close()

    print(f"FlowSync database created successfully: {DB_PATH}")

if __name__ == "__main__":
    init_database()