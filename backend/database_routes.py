from fastapi import FastAPI

from api_utils import validate_positive_integer
from database_admin import (
    apply_database_indexes,
    create_database_backup,
    get_database_readiness,
    get_database_status,
    get_database_tables,
)


def register_database_routes(app: FastAPI):
    @app.get("/api/database/status", tags=["Database"])
    def database_status():
        return get_database_status()

    @app.get("/api/database/tables", tags=["Database"])
    def database_tables():
        return get_database_tables()

    @app.get("/api/database/readiness", tags=["Database"])
    def database_readiness():
        return get_database_readiness()

    @app.post("/api/database/admin/apply-indexes", tags=["Database"])
    def database_apply_indexes():
        return apply_database_indexes()

    @app.post("/api/database/admin/backup", tags=["Database"])
    def database_backup():
        return create_database_backup()