from fastapi import FastAPI, HTTPException

from api_utils import clean_text, validate_positive_integer
from background_jobs import (
    get_background_job_history,
    get_background_job_status,
    init_background_job_tables,
    run_all_background_jobs,
    run_background_job,
)


def register_background_job_routes(app: FastAPI):
    init_background_job_tables()

    @app.get("/api/jobs/status", tags=["Background Jobs"])
    def jobs_status():
        return get_background_job_status()

    @app.post("/api/jobs/run", tags=["Background Jobs"])
    def run_all_jobs():
        return run_all_background_jobs()

    @app.post("/api/jobs/run/{job_name}", tags=["Background Jobs"])
    def run_single_job(job_name: str):
        clean_job_name = clean_text(
            job_name,
            "job_name",
            max_length=120,
        )

        result = run_background_job(clean_job_name)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.get("/api/jobs/history", tags=["Background Jobs"])
    def jobs_history(limit: int = 20):
        clean_limit = validate_positive_integer(limit, "limit")
        clean_limit = min(clean_limit, 100)

        return get_background_job_history(clean_limit)