from conftest import assert_ok


def test_final_status(client):
    payload = assert_ok(client.get("/api/final/status"))

    assert payload.get("backend_complete_v1") is True
    assert payload.get("ready_for_demo") is True
    assert payload.get("ready_for_team_integration") is True
    assert payload.get("completed_capabilities_count") >= 25


def test_final_checklist(client):
    payload = assert_ok(client.get("/api/final/checklist"))

    assert "required_before_demo" in payload
    assert "important_demo_urls" in payload


def test_final_handoff(client):
    payload = assert_ok(client.get("/api/final/handoff"))

    assert "handoff_message" in payload
    assert "team_next_steps" in payload
    assert "frontend_team" in payload["team_next_steps"]


def test_final_completion_report(client):
    payload = assert_ok(client.get("/api/final/completion-report"))

    assert "completion_report" in payload
    assert "test_checklist" in payload
    assert "team_handoff" in payload
