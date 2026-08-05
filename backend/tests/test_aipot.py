import json
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

from app.features.aipot import service
from app.main import app


def _question(number: int, question_type: str, **extra: object) -> dict:
    base = {
        "number": number,
        "type": question_type,
        "chapter": "C01",
        "topic": "AI 기초",
        "prompt": f"문항 {number}",
    }
    base.update(extra)
    return base


def _write_content(root: Path) -> None:
    (root / "corpus" / "ocr").mkdir(parents=True)
    (root / "generated").mkdir()
    (root / "assets" / "source-round-01").mkdir(parents=True)
    (root / "assets" / "source-round-01" / "q01-visual-01.jpg").write_bytes(b"visual")
    (root / "assets" / "source-round-01" / "q36-reference.jpg").write_bytes(b"reference")
    source = {
        "id": "source-round-01",
        "title": "원본 1회",
        "source_kind": "private_photographed_book",
        "questions": [
            _question(1, "multiple_choice", source_page=1, answer="1", accepted_answers=["1"], visuals=[{"marker": "[그래프:", "file": "q01-visual-01.jpg", "alt": "테스트 그래프"}]),
            _question(
                36,
                "practical_prompt",
                source_page=17,
                rubric=[{"criterion": "목표", "points": 10, "hints": ["목표"]}],
                primary_visual={"file": "q36-reference.jpg", "alt": "실습 참고 이미지"},
            ),
        ],
    }
    generated = {
        "id": "generated-mock-01",
        "title": "창작 1회",
        "source_kind": "original_generated",
        "questions": [
            _question(
                1,
                "multiple_choice",
                choices=["정답", "오답"],
                answer="1",
                accepted_answers=["1"],
                explanation="정답 설명",
            )
        ],
    }
    (root / "corpus" / "source-round-01.json").write_text(json.dumps(source), encoding="utf-8")
    (root / "corpus" / "ocr" / "source-round-01.md").write_text(
        "## Q01\n\n- Source: ../../assets/source-round-01/page-01.jpg\n\nOCR로 확인한 첫 번째 문제입니다.\n\n1. 실제 첫 번째 선택지\n2. 실제 두 번째 선택지\n3. 실제 세 번째 선택지\n4. 실제 네 번째 선택지\n\n## Q36\n\n세그먼트 참고 이미지를 보고 실습 문제를 해결하세요.\n",
        encoding="utf-8",
    )
    (root / "generated" / "generated-mock-01.json").write_text(
        json.dumps(generated), encoding="utf-8"
    )


def test_public_exam_hides_answers_and_only_allows_question_assets(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    _write_content(content)
    monkeypatch.setattr(
        service,
        "settings",
        replace(service.settings, aipot_content_root=content, aipot_history_file=tmp_path / "history.json"),
    )

    client = TestClient(app)
    response = client.get("/api/v1/aipot/exams/source-round-01")

    assert response.status_code == 200
    assert "answer" not in response.text
    first_question = response.json()["questions"][0]
    assert first_question["ocr_text"] == "OCR로 확인한 첫 번째 문제입니다."
    assert first_question["choices"] == [
        "실제 첫 번째 선택지",
        "실제 두 번째 선택지",
        "실제 세 번째 선택지",
        "실제 네 번째 선택지",
    ]
    assert first_question["multiple_selection"] is False
    assert first_question["asset_url"] is None
    assert first_question["visual_assets"] == [{"marker": "[그래프:", "asset_url": "/api/v1/aipot/exams/source-round-01/assets/q01-visual-01.jpg", "alt": "테스트 그래프", "keep_marker_text": False}]
    assert response.json()["questions"][1]["ocr_text"] == "세그먼트 참고 이미지를 보고 실습 문제를 해결하세요."
    assert response.json()["questions"][1]["asset_url"].endswith("q36-reference.jpg")
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/page-01.jpg").status_code == 404
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/page-17.jpg").status_code == 404
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/q01-visual-01.jpg").status_code == 200
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/q36-reference.jpg").status_code == 200
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/page-99.jpg").status_code == 404


def test_ocr_choice_parser_supports_circled_choices():
    stem, choices = service._split_ocr_multiple_choice(
        "질문 본문입니다.\n\n① 실제 첫 번째 선택지\n\n② 실제 두 번째 선택지\n\n③ 실제 세 번째 선택지\n\n④ 실제 네 번째 선택지"
    )

    assert stem == "질문 본문입니다."
    assert choices == ["실제 첫 번째 선택지", "실제 두 번째 선택지", "실제 세 번째 선택지", "실제 네 번째 선택지"]


def test_exam_cover_instructions_are_not_sent_as_question_one_text():
    section = "`AI-POT 실전 모의고사 01회` / `1급`\n\n※ 안내문\n\n### 객관식\n\n실제 첫 번째 문제입니다."

    assert service._strip_exam_preamble(section) == "실제 첫 번째 문제입니다."


def test_ocr_choice_parser_moves_final_choice_table_out_of_the_stem():
    stem, choices = service._split_ocr_multiple_choice(
        "표의 정보를 보고 알맞은 조합을 고르시오.\n\n| 번호 | A | B |\n| --- | --- | --- |\n| ① | 실제 A1 | 실제 B1 |\n| ② | 실제 A2 | 실제 B2 |\n| ③ | 실제 A3 | 실제 B3 |\n| ④ | 실제 A4 | 실제 B4 |"
    )

    assert stem == "표의 정보를 보고 알맞은 조합을 고르시오."
    assert choices == ["실제 A1 · 실제 B1", "실제 A2 · 실제 B2", "실제 A3 · 실제 B3", "실제 A4 · 실제 B4"]


def test_submission_is_idempotent_and_history_surfaces_a_weakness(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    _write_content(content)
    monkeypatch.setattr(
        service,
        "settings",
        replace(service.settings, aipot_content_root=content, aipot_history_file=tmp_path / "history.json"),
    )
    client = TestClient(app)
    payload = {
        "client_submission_id": "submission-1234",
        "elapsed_seconds": 120,
        "answers": {"1": "2"},
    }

    first = client.post("/api/v1/aipot/exams/source-round-01/submissions", json=payload)
    second = client.post("/api/v1/aipot/exams/source-round-01/submissions", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["reviews"][0]["correct_answer"] == "1"
    study_history = client.get("/api/v1/aipot/history")
    assert study_history.status_code == 200
    assert study_history.json()["exams"][0]["attempts"] == 1
    assert study_history.json()["weaknesses"][0]["chapter"] == "C01"


def test_immediate_feedback_returns_locked_answer_explanations_from_web_data(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "generated-mock-01.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(json.dumps({
        "id": "generated-mock-01", "title": "웹 세트", "sourceKind": "original_generated",
        "questions": [{
            "number": 1, "type": "multiple_choice", "chapter": "C01", "topic": "AI 기초", "prompt": "문제", "points": 2,
            "answer": "2", "accepted_answers": ["2"],
            "choices": [
                {"id": "1", "text": "오답", "feedback": {"definition": "정의", "purpose": "용도", "reason": "오답 이유", "similarities": "유사점", "differences": "차이"}},
                {"id": "2", "text": "정답", "feedback": {"definition": "정의", "purpose": "용도", "reason": "정답 이유", "similarities": "유사점", "differences": "차이"}},
            ],
        }],
    }), encoding="utf-8")
    monkeypatch.setattr(service, "settings", replace(service.settings, aipot_content_root=content, aipot_history_file=tmp_path / "history.json"))

    client = TestClient(app)
    response = client.post("/api/v1/aipot/exams/generated-mock-01/questions/1/feedback", json={"answer": "1"})

    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is False
    assert body["earned"] == 0
    assert body["correct_answer"] == "2"
    assert body["choice_feedback"][1]["correct"] is True
    assert body["choice_feedback"][0]["differences"] == "차이"


def test_web_manifest_assets_resolve_from_the_quiz_relative_path(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "public-set-a.json"
    image = content / "assets" / "public-sets" / "page-23.png"
    manifest_path.parent.mkdir(parents=True)
    image.parent.mkdir(parents=True)
    image.write_bytes(b"private-page")
    manifest_path.write_text(json.dumps({
        "id": "public-set-a", "title": "공개 A", "sourceKind": "private_reference_pdf",
        "questions": [{"number": 1, "type": "multiple_choice", "chapter": "C01", "topic": "AI", "prompt": "문제", "points": 2, "asset": "../assets/public-sets/page-23.png", "answer": "1", "accepted_answers": ["1"], "choices": []}],
    }), encoding="utf-8")
    monkeypatch.setattr(service, "settings", replace(service.settings, aipot_content_root=content, aipot_history_file=tmp_path / "history.json"))

    response = TestClient(app).get("/api/v1/aipot/exams/public-set-a/assets/page-23.png")

    assert response.status_code == 200
    assert response.content == b"private-page"
