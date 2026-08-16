import json
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

from app.features.aipot import service, wrong_note_set
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
            _question(
                1,
                "multiple_choice",
                source_page=1,
                answer="1",
                accepted_answers=["1"],
                visuals=[
                    {"marker": "[그래프:", "file": "q01-visual-01.jpg", "alt": "테스트 그래프"}
                ],
            ),
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
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
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
    assert first_question["visual_assets"] == [
        {
            "marker": "[그래프:",
            "asset_url": "/api/v1/aipot/exams/source-round-01/assets/q01-visual-01.jpg",
            "alt": "테스트 그래프",
            "keep_marker_text": False,
            "replace_following_block": False,
        }
    ]
    assert (
        response.json()["questions"][1]["ocr_text"]
        == "세그먼트 참고 이미지를 보고 실습 문제를 해결하세요."
    )
    assert response.json()["questions"][1]["asset_url"].endswith("q36-reference.jpg")
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/page-01.jpg").status_code == 404
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/page-17.jpg").status_code == 404
    assert (
        client.get("/api/v1/aipot/exams/source-round-01/assets/q01-visual-01.jpg").status_code
        == 200
    )
    assert (
        client.get("/api/v1/aipot/exams/source-round-01/assets/q36-reference.jpg").status_code
        == 200
    )
    assert client.get("/api/v1/aipot/exams/source-round-01/assets/page-99.jpg").status_code == 404


def test_ocr_choice_parser_supports_circled_choices():
    stem, choices = service._split_ocr_multiple_choice(
        "질문 본문입니다.\n\n① 실제 첫 번째 선택지\n\n② 실제 두 번째 선택지\n\n③ 실제 세 번째 선택지\n\n④ 실제 네 번째 선택지"
    )

    assert stem == "질문 본문입니다."
    assert choices == [
        "실제 첫 번째 선택지",
        "실제 두 번째 선택지",
        "실제 세 번째 선택지",
        "실제 네 번째 선택지",
    ]


def test_exam_cover_instructions_are_not_sent_as_question_one_text():
    section = (
        "`AI-POT 실전 모의고사 01회` / `1급`\n\n※ 안내문\n\n### 객관식\n\n실제 첫 번째 문제입니다."
    )

    assert service._strip_exam_preamble(section) == "실제 첫 번째 문제입니다."


def test_manifest_sanitizer_removes_cover_and_duplicate_ui_choices():
    manifest = {
        "questions": [
            {
                "number": 1,
                "prompt": "`AI-POT 실전 모의고사 01회` / `1급`\n\n총 60분\n\n### 객관식\n\n학습의 의미로 알맞은 것을 고르시오.\n\n1. 적용\n2. 추론\n3. 학습\n4. 최적화",
                "choices": ["적용", "추론", "학습", "최적화"],
            }
        ]
    }

    assert (
        service._sanitize_manifest(manifest)["questions"][0]["prompt"]
        == "학습의 의미로 알맞은 것을 고르시오."
    )


def test_manifest_sanitizer_removes_circled_duplicate_ui_choices():
    assert (
        service._strip_terminal_rendered_choices(
            "질문 본문입니다.\n\n① 적용\n② 추론\n③ 학습\n④ 최적화",
            ["적용", "추론", "학습", "최적화"],
        )
        == "질문 본문입니다."
    )


def test_manifest_sanitizer_keeps_terminal_numbered_scenarios_that_are_not_choices():
    prompt = """사건을 분석하세요.

1. 첫 번째 사건
2. 두 번째 사건
3. 세 번째 사건
4. 네 번째 사건"""

    assert (
        service._strip_terminal_rendered_choices(
            prompt,
            ["다양성 존중", "투명성", "책임성", "프라이버시 보호"],
        )
        == prompt
    )


def test_reviewed_source_web_manifest_does_not_restore_an_older_ocr_choice(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    _write_content(content)
    web_manifest = content / "data" / "web-exams" / "source-round-01.json"
    web_manifest.parent.mkdir(parents=True)
    web_manifest.write_text(
        json.dumps(
            {
                "id": "source-round-01",
                "title": "검토 원본",
                "source_kind": "private_photographed_book",
                "questions": [
                    _question(
                        1,
                        "multiple_choice",
                        points=2,
                        answer="1",
                        accepted_answers=["1"],
                        prompt="[자료]\n\n검토된 문제 본문",
                        choices=[{"id": "1", "text": "검토된 적응"}, {"id": "2", "text": "추론"}],
                        visuals=[
                            {
                                "marker": "[자료]",
                                "file": "q01-visual-01.jpg",
                                "alt": "검토된 원본 자료",
                            }
                        ],
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    response = TestClient(app).get("/api/v1/aipot/exams/source-round-01")

    assert response.status_code == 200
    assert response.json()["questions"][0]["prompt"] == "[자료]\n\n검토된 문제 본문"
    assert response.json()["questions"][0]["choices"] == ["검토된 적응", "추론"]
    assert response.json()["questions"][0]["visual_assets"][0]["asset_url"].endswith(
        "q01-visual-01.jpg"
    )
    assert (
        TestClient(app)
        .get("/api/v1/aipot/exams/source-round-01/assets/q01-visual-01.jpg")
        .status_code
        == 200
    )


def test_sample_set_identifier_is_a_valid_exam_id():
    assert service._EXAM_ID.fullmatch("sample-set-01")


def test_wrong_note_set_supports_question_50_and_manifest_scoped_submission(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "sample-set-01.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "sample-set-01",
                "title": "오답 노트",
                "study_mode": "wrong_note",
                "questions": [
                    _question(
                        number,
                        "multiple_choice",
                        points=2,
                        answer="1",
                        accepted_answers=["1"],
                        choices=[
                            {
                                "id": str(choice),
                                "text": f"보기 {choice}",
                                "feedback": {"explanation": f"보기 {choice} 해설"},
                            }
                            for choice in range(1, 5)
                        ],
                    )
                    for number in range(1, 51)
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )
    client = TestClient(app)

    exam = client.get("/api/v1/aipot/exams/sample-set-01")
    assert exam.status_code == 200
    assert exam.json()["study_mode"] == "wrong_note"
    assert exam.json()["question_count"] == 50
    assert exam.json()["questions"][-1]["number"] == 50
    feedback = client.post(
        "/api/v1/aipot/exams/sample-set-01/questions/50/feedback", json={"answer": "1"}
    )
    assert feedback.status_code == 200
    assert feedback.json()["correct"] is True

    submitted = client.post(
        "/api/v1/aipot/exams/sample-set-01/submissions",
        json={
            "client_submission_id": "wrong-note-question-50",
            "elapsed_seconds": 20,
            "answers": {"50": "1"},
        },
    )
    assert submitted.status_code == 200
    assert submitted.json()["answered_count"] == 1
    assert submitted.json()["reviews"][-1]["submitted_answer"] == "1"
    assert (
        client.post(
            "/api/v1/aipot/exams/sample-set-01/questions/51/feedback", json={"answer": "1"}
        ).status_code
        == 404
    )


def test_wrong_note_selection_excludes_blank_legacy_reviews_and_keeps_partial_answers():
    selected = wrong_note_set._selected_sources(
        {
            "public-set-a": {
                "reviews": [
                    {
                        "number": 25,
                        "submitted_answer": "kfold",
                        "score": 0,
                        "possible_score": 2,
                        "is_unanswered": False,
                    },
                    {
                        "number": 38,
                        "submitted_answer": "짧은 프롬프트",
                        "score": 4,
                        "possible_score": 5,
                        "is_unanswered": False,
                    },
                ]
            },
            "source-round-01": {
                "reviews": [
                    {
                        "number": 36,
                        "submitted_answer": "",
                        "score": 0,
                        "possible_score": 5,
                        "is_unanswered": False,
                    },
                ]
            },
        }
    )

    assert selected == {("public-set-a", 25), ("public-set-a", 38)}


def test_wrong_note_fact_bank_covers_latest_public_b_mistakes_without_reusing_conflicted_a38():
    sources = {(fact.exam_id, fact.number) for fact in wrong_note_set.FACTS}

    assert {("public-set-b", 26), ("public-set-b", 28)} <= sources
    assert ("public-set-a", 38) not in sources


def test_wrong_note_excludes_descriptive_and_practical_source_questions():
    selected = {
        ("public-set-a", 25),
        ("public-set-a", 31),
        ("public-set-a", 37),
        ("source-round-02", 2),
    }
    question_types = {
        ("public-set-a", 25): "short_answer",
        ("public-set-a", 31): "choice_bank",
        ("public-set-a", 37): "practical_prompt",
        ("source-round-02", 2): "multiple_choice",
    }

    assert wrong_note_set._reusable_sources(selected, question_types) == {
        ("public-set-a", 31),
        ("source-round-02", 2),
    }


def test_wrong_note_variants_have_distinct_rendered_prompts():
    fact = next(fact for fact in wrong_note_set.FACTS if fact.count == 4 and fact.short_answer)
    questions = [
        wrong_note_set._question(fact, number=index + 1, variant=index) for index in range(4)
    ]

    assert len({question["prompt"] for question in questions}) == 4


def test_ocr_choice_parser_moves_final_choice_table_out_of_the_stem():
    stem, choices = service._split_ocr_multiple_choice(
        "표의 정보를 보고 알맞은 조합을 고르시오.\n\n| 번호 | A | B |\n| --- | --- | --- |\n| ① | 실제 A1 | 실제 B1 |\n| ② | 실제 A2 | 실제 B2 |\n| ③ | 실제 A3 | 실제 B3 |\n| ④ | 실제 A4 | 실제 B4 |"
    )

    assert stem == "표의 정보를 보고 알맞은 조합을 고르시오."
    assert choices == [
        "실제 A1 · 실제 B1",
        "실제 A2 · 실제 B2",
        "실제 A3 · 실제 B3",
        "실제 A4 · 실제 B4",
    ]


def test_submission_is_idempotent_and_history_surfaces_a_weakness(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    _write_content(content)
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
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
    unanswered = first.json()["reviews"][1]
    assert unanswered["result"] == "미응답"
    assert unanswered["is_unanswered"] is True
    assert unanswered["missing"] == []
    study_history = client.get("/api/v1/aipot/history")
    assert study_history.status_code == 200
    assert study_history.json()["exams"][0]["attempts"] == 1
    assert study_history.json()["exams"][0]["previous_attempts"] == [
        {
            "id": first.json()["id"],
            "exam_id": "source-round-01",
            "exam_title": "원본 1회",
            "submitted_at": first.json()["submitted_at"],
            "score": 0.0,
            "answered_count": 1,
        }
    ]
    assert study_history.json()["weaknesses"][0]["chapter"] == "C01"


def test_unanswered_questions_are_flagged_without_polluting_wrong_answer_topics(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "generated-mock-01.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "generated-mock-01",
                "title": "미응답 분리",
                "sourceKind": "original_generated",
                "questions": [
                    _question(
                        1,
                        "multiple_choice",
                        chapter="C01",
                        topic="응답한 오답",
                        points=2,
                        answer="1",
                        accepted_answers=["1"],
                    ),
                    _question(
                        2,
                        "multiple_choice",
                        chapter="C02",
                        topic="미응답 주제",
                        points=2,
                        answer="1",
                        accepted_answers=["1"],
                    ),
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    response = TestClient(app).post(
        "/api/v1/aipot/exams/generated-mock-01/submissions",
        json={
            "client_submission_id": "unanswered-flag-1234",
            "elapsed_seconds": 60,
            "answers": {"1": "2"},
        },
    )

    assert response.status_code == 200
    answered, unanswered = response.json()["reviews"]
    assert answered["result"] == "오답"
    assert answered["is_unanswered"] is False
    assert unanswered["result"] == "미응답"
    assert unanswered["is_unanswered"] is True
    assert unanswered["missing"] == []
    assert [chapter["chapter"] for chapter in response.json()["chapters"]] == ["C01"]

    history = TestClient(app).get("/api/v1/aipot/history").json()
    assert [item["chapter"] for item in history["weaknesses"]] == ["C01"]
    assert history["weaknesses"][0]["topics"] == ["응답한 오답"]


def test_submission_can_store_practical_answers_without_running_evaluation(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "generated-mock-01.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "generated-mock-01",
                "title": "무생성 제출",
                "sourceKind": "original_generated",
                "questions": [
                    _question(
                        36,
                        "practical_prompt",
                        points=5,
                        rubric=[{"criterion": "검증", "points": 5, "keywords": ["검증"]}],
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    class EvaluatorMustNotRun:
        def completed(self, **_: object) -> dict:
            raise AssertionError(
                "The practical evaluator must not run for a no-generation submission."
            )

    monkeypatch.setattr(service, "_practical_evaluator", lambda: EvaluatorMustNotRun())
    response = TestClient(app).post(
        "/api/v1/aipot/exams/generated-mock-01/submissions",
        json={
            "client_submission_id": "no-evaluation-1234",
            "elapsed_seconds": 60,
            "answers": {"36": "이미지나 차트를 생성하지 않는 제출 답안"},
            "skip_practical_evaluation": True,
        },
    )

    assert response.status_code == 200
    review = response.json()["reviews"][0]
    assert review["submitted_answer"] == "이미지나 차트를 생성하지 않는 제출 답안"
    assert review["result"] == "제출됨 · 미평가"
    assert review["evaluation"] is None
    assert review["missing"] == ["자동 평가를 건너뜀"]

    skipped = TestClient(app).post(
        "/api/v1/aipot/exams/generated-mock-01/submissions",
        json={
            "client_submission_id": "skip-practical-1234",
            "elapsed_seconds": 60,
            "answers": {},
            "skip_practical_evaluation": True,
        },
    )

    assert skipped.status_code == 200
    skipped_review = skipped.json()["reviews"][0]
    assert skipped_review["submitted_answer"] == ""
    assert skipped_review["result"] == "미응답"
    assert skipped_review["is_unanswered"] is True
    assert skipped_review["missing"] == []
    assert skipped_review["score"] == 0
    assert skipped.json()["chapters"] == []


def test_submission_with_new_chapter_code_uses_code_as_safe_title(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "generated-mock-01.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "generated-mock-01",
                "title": "새 챕터",
                "sourceKind": "original_generated",
                "questions": [
                    _question(
                        18,
                        "multiple_choice",
                        chapter="C18",
                        topic="토픽 모델링",
                        points=2,
                        answer="1",
                        accepted_answers=["1"],
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    response = TestClient(app).post(
        "/api/v1/aipot/exams/generated-mock-01/submissions",
        json={
            "client_submission_id": "new-chapter-1234",
            "elapsed_seconds": 60,
            "answers": {"18": "1"},
        },
    )

    assert response.status_code == 200
    assert response.json()["chapters"] == [
        {
            "chapter": "C18",
            "chapter_title": "C18",
            "earned": 2.0,
            "possible": 2.0,
            "percent": 100.0,
            "topics": [],
            "recommendation": "다음 챕터 진행",
        }
    ]


def test_submission_uses_the_practical_evidence_id_created_when_answer_was_locked(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "public-set-a.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "public-set-a",
                "title": "확정 결과 제출",
                "sourceKind": "private_reference_pdf",
                "questions": [
                    _question(
                        36,
                        "practical_prompt",
                        points=5,
                        rubric=[{"criterion": "검증", "points": 5, "keywords": ["검증"]}],
                        evaluation={"kind": "image", "availability": "available"},
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    class EvaluatorWithSavedEvidence:
        def completed(self, **kwargs: object) -> dict:
            assert kwargs["evaluation_id"] == "locked-image-evaluation"
            assert kwargs["answer"] == "확정한 이미지 프롬프트"
            return {
                "id": "locked-image-evaluation",
                "kind": "image",
                "submitted_prompt": "확정한 이미지 프롬프트",
                "input_summary": "reference image",
                "executor_model": "image-model",
                "judge_model": "judge-model",
                "criteria": [
                    {
                        "criterion": "검증",
                        "possible": 5,
                        "earned": 5,
                        "met": True,
                        "rationale": "충족",
                        "evidence": "생성 결과",
                    }
                ],
                "artifact": {
                    "kind": "image",
                    "media_type": "image/png",
                    "asset_url": "/artifact",
                    "text": None,
                    "stdout": None,
                    "stderr": None,
                    "exit_code": None,
                },
            }

    monkeypatch.setattr(service, "_practical_evaluator", lambda: EvaluatorWithSavedEvidence())
    response = TestClient(app).post(
        "/api/v1/aipot/exams/public-set-a/submissions",
        json={
            "client_submission_id": "locked-evidence-1234",
            "elapsed_seconds": 60,
            "answers": {"36": "확정한 이미지 프롬프트"},
            "practical_evaluation_ids": {"36": "locked-image-evaluation"},
        },
    )

    assert response.status_code == 200
    assert response.json()["reviews"][0]["evaluation"]["id"] == "locked-image-evaluation"
    assert response.json()["reviews"][0]["score"] == 5


def test_immediate_feedback_returns_selected_choice_keyword_explanations_from_web_data(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "generated-mock-01.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "generated-mock-01",
                "title": "웹 세트",
                "sourceKind": "original_generated",
                "questions": [
                    {
                        "number": 1,
                        "type": "multiple_choice",
                        "chapter": "C01",
                        "topic": "AI 기초",
                        "prompt": "문제",
                        "points": 2,
                        "answer": "2",
                        "accepted_answers": ["2"],
                        "choices": [
                            {
                                "id": "1",
                                "text": "오답",
                                "feedback": {"explanation": "오답 키워드 설명"},
                            },
                            {
                                "id": "2",
                                "text": "정답",
                                "feedback": {"explanation": "정답 키워드 설명"},
                            },
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    client = TestClient(app)
    response = client.post(
        "/api/v1/aipot/exams/generated-mock-01/questions/1/feedback", json={"answer": "1"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is False
    assert body["earned"] == 0
    assert body["correct_answer"] == "2"
    assert body["choice_feedback"][1]["correct"] is True
    assert body["choice_feedback"][0]["explanation"] == "오답 키워드 설명"
    assert "differences" not in body["choice_feedback"][0]


def test_immediate_feedback_marks_every_official_multiple_select_choice(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "public-set-a.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "public-set-a",
                "title": "공개 A",
                "sourceKind": "private_reference_pdf",
                "questions": [
                    {
                        "number": 13,
                        "type": "multiple_select",
                        "chapter": "C01",
                        "topic": "어텐션",
                        "prompt": "복수 정답",
                        "points": 2,
                        "answer": "1|3",
                        "accepted_answers": ["1|3"],
                        "choices": [
                            {
                                "id": "1",
                                "text": "정답 하나",
                                "feedback": {"explanation": "첫 번째 정답"},
                            },
                            {"id": "2", "text": "오답", "feedback": {"explanation": "오답 설명"}},
                            {
                                "id": "3",
                                "text": "정답 둘",
                                "feedback": {"explanation": "두 번째 정답"},
                            },
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    response = TestClient(app).post(
        "/api/v1/aipot/exams/public-set-a/questions/13/feedback", json={"answer": "3|1"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is True
    assert [choice["correct"] for choice in body["choice_feedback"]] == [True, False, True]


def test_short_answer_uses_only_reviewed_exact_aliases_and_returns_expected_answer(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "public-set-a.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "public-set-a",
                "title": "공개 A",
                "sourceKind": "private_reference_pdf",
                "questions": [
                    {
                        "number": 25,
                        "type": "short_answer",
                        "chapter": "C09",
                        "topic": "교차검증",
                        "prompt": "K개로 나누어 검증하는 기법을 작성하시오.",
                        "points": 2,
                        "answer": "k-fold cross validation",
                        "accepted_answers": [
                            "k-fold cross validation",
                            "k-fold cross-validation",
                            "k-fold validataion",
                            "k fold cross validation",
                            "k-fold 교차검증",
                            "k-폴드 교차검증",
                            "k fold 교차검증",
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    client = TestClient(app)
    for answer in ["k-fold cross-validation", "K-fold validataion", "K-fold 교차검증"]:
        response = client.post(
            "/api/v1/aipot/exams/public-set-a/questions/25/feedback", json={"answer": answer}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["correct_answer"] == "k-fold cross validation"
        assert body["correct"] is True
        assert body["earned"] == 2

    rejected = client.post(
        "/api/v1/aipot/exams/public-set-a/questions/25/feedback",
        json={"answer": "5-fold cross validation"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["correct"] is False
    assert rejected.json()["correct_answer"] == "k-fold cross validation"


def test_short_answer_accepts_reviewed_backpropagation_aliases_only(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "public-set-b.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        json.dumps(
            {
                "id": "public-set-b",
                "title": "공개 B",
                "sourceKind": "private_reference_pdf",
                "questions": [
                    {
                        "number": 24,
                        "type": "short_answer",
                        "chapter": "C03",
                        "topic": "오류 역전파",
                        "prompt": "신경망 학습에서 오차를 역방향으로 전파하는 알고리즘을 작성하시오.",
                        "points": 2,
                        "answer": "backpropagation",
                        "accepted_answers": [
                            "backpropagation",
                            "back propagation",
                            "back-propagation",
                            "backpropagation algorithm",
                            "오류 역전파",
                            "오류역전파",
                            "역전파",
                            "역전파 알고리즘",
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    client = TestClient(app)
    for answer in [
        "back propagation",
        "Backpropagation Algorithm",
        "오류 역전파",
        "역전파",
        "역전파 알고리즘",
    ]:
        response = client.post(
            "/api/v1/aipot/exams/public-set-b/questions/24/feedback", json={"answer": answer}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["correct_answer"] == "backpropagation"
        assert body["correct"] is True
        assert body["earned"] == 2

    rejected = client.post(
        "/api/v1/aipot/exams/public-set-b/questions/24/feedback",
        json={"answer": "gradient descent"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["correct"] is False
    assert rejected.json()["correct_answer"] == "backpropagation"


def test_web_manifest_assets_resolve_from_the_quiz_relative_path(tmp_path: Path, monkeypatch):
    content = tmp_path / "content"
    manifest_path = content / "data" / "web-exams" / "public-set-a.json"
    image = content / "assets" / "public-sets" / "page-23.png"
    manifest_path.parent.mkdir(parents=True)
    image.parent.mkdir(parents=True)
    image.write_bytes(b"private-page")
    manifest_path.write_text(
        json.dumps(
            {
                "id": "public-set-a",
                "title": "공개 A",
                "sourceKind": "private_reference_pdf",
                "questions": [
                    {
                        "number": 1,
                        "type": "multiple_choice",
                        "chapter": "C01",
                        "topic": "AI",
                        "prompt": "문제",
                        "points": 2,
                        "asset": "../assets/public-sets/page-23.png",
                        "answer": "1",
                        "accepted_answers": ["1"],
                        "choices": [],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    response = TestClient(app).get("/api/v1/aipot/exams/public-set-a/assets/page-23.png")

    assert response.status_code == 200
    assert response.content == b"private-page"


def test_source_web_manifest_uses_corpus_visual_segments_as_the_single_source(
    tmp_path: Path, monkeypatch
):
    content = tmp_path / "content"
    web_manifest = content / "data" / "web-exams" / "source-round-01.json"
    corpus_manifest = content / "corpus" / "source-round-01.json"
    asset = content / "assets" / "source-round-01" / "q16-visual-01.jpg"
    web_manifest.parent.mkdir(parents=True)
    corpus_manifest.parent.mkdir(parents=True)
    asset.parent.mkdir(parents=True)
    asset.write_bytes(b"visual")
    web_manifest.write_text(
        json.dumps(
            {
                "id": "source-round-01",
                "title": "원본 1회",
                "source_kind": "private_photographed_book",
                "questions": [
                    {
                        "number": 16,
                        "type": "multiple_choice",
                        "chapter": "C07",
                        "topic": "프롬프팅",
                        "prompt": "[개념도]\\n\\n| 입력 | 출력 |",
                        "points": 2,
                        "asset": "../assets/source-round-01/q16-visual-01.jpg",
                        "answer": "1",
                        "accepted_answers": ["1"],
                        "choices": [],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    corpus_manifest.write_text(
        json.dumps(
            {
                "questions": [
                    {
                        "number": 16,
                        "visuals": [
                            {
                                "marker": "[개념도]",
                                "file": "q16-visual-01.jpg",
                                "alt": "원샷 개념도",
                                "replace_following_block": True,
                            }
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        service,
        "settings",
        replace(
            service.settings,
            aipot_content_root=content,
            aipot_history_file=tmp_path / "history.json",
        ),
    )

    question = TestClient(app).get("/api/v1/aipot/exams/source-round-01").json()["questions"][0]

    assert question["asset_url"] is None
    assert question["visual_assets"] == [
        {
            "marker": "[개념도]",
            "asset_url": "/api/v1/aipot/exams/source-round-01/assets/q16-visual-01.jpg",
            "alt": "원샷 개념도",
            "keep_marker_text": False,
            "replace_following_block": True,
        }
    ]
    asset_response = TestClient(app).get(
        "/api/v1/aipot/exams/source-round-01/assets/q16-visual-01.jpg"
    )
    assert asset_response.status_code == 200
    assert asset_response.content == b"visual"
