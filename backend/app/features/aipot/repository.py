"""ACID persistence for AI-POT attempts and evidence-backed evaluations."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

EvaluationReservation = Literal["reserved", "completed", "pending"]


@dataclass(frozen=True, slots=True)
class StoredEvaluation:
    id: str
    response: dict[str, Any]


class AipotRepository:
    """Small SQLite repository; every public write has a transaction boundary."""

    def __init__(self, database_file: Path, legacy_history_file: Path) -> None:
        self.database_file = database_file
        self.legacy_history_file = legacy_history_file

    def _connect(self) -> sqlite3.Connection:
        self.database_file.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.database_file, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = FULL")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS attempts (
                    id TEXT PRIMARY KEY,
                    exam_id TEXT NOT NULL,
                    client_submission_id TEXT NOT NULL,
                    exam_title TEXT NOT NULL,
                    submitted_at TEXT NOT NULL,
                    elapsed_seconds INTEGER NOT NULL,
                    score REAL NOT NULL,
                    answered_count INTEGER NOT NULL,
                    reviews_json TEXT NOT NULL,
                    chapters_json TEXT NOT NULL,
                    UNIQUE(exam_id, client_submission_id)
                );
                CREATE TABLE IF NOT EXISTS evaluations (
                    id TEXT PRIMARY KEY,
                    exam_id TEXT NOT NULL,
                    question_number INTEGER NOT NULL,
                    answer_hash TEXT NOT NULL,
                    question_hash TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('pending', 'completed')),
                    response_json TEXT,
                    artifact_blob BLOB,
                    artifact_media_type TEXT,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    UNIQUE(exam_id, question_number, answer_hash, question_hash)
                );
                CREATE INDEX IF NOT EXISTS evaluations_lookup
                    ON evaluations(exam_id, question_number, answer_hash, question_hash);
                """
            )
        self._migrate_legacy_history()

    def _migrate_legacy_history(self) -> None:
        if not self.legacy_history_file.is_file():
            return
        try:
            legacy = json.loads(self.legacy_history_file.read_text(encoding="utf-8"))
            records = legacy.get("attempts", []) if isinstance(legacy, dict) else []
        except (OSError, json.JSONDecodeError):
            return
        if not isinstance(records, list):
            return
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                for record in records:
                    if not isinstance(record, dict) or not record.get("id"):
                        continue
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO attempts (
                            id, exam_id, client_submission_id, exam_title, submitted_at,
                            elapsed_seconds, score, answered_count, reviews_json, chapters_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            str(record["id"]),
                            str(record.get("exam_id", "")),
                            str(record.get("client_submission_id", f"legacy-{record['id']}")),
                            str(record.get("exam_title", "AI-POT")),
                            str(record.get("submitted_at", datetime.now(UTC).isoformat())),
                            int(record.get("elapsed_seconds", 0)),
                            float(record.get("score", 0)),
                            int(record.get("answered_count", 0)),
                            json.dumps(record.get("reviews", []), ensure_ascii=False),
                            json.dumps(record.get("chapters", []), ensure_ascii=False),
                        ),
                    )
                connection.commit()
            except Exception:
                connection.rollback()
                raise

    def reserve_evaluation(
        self, *, evaluation_id: str, exam_id: str, question_number: int,
        answer_hash: str, question_hash: str,
    ) -> EvaluationReservation:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                """
                SELECT status FROM evaluations
                WHERE exam_id = ? AND question_number = ? AND answer_hash = ? AND question_hash = ?
                """,
                (exam_id, question_number, answer_hash, question_hash),
            ).fetchone()
            if existing:
                connection.commit()
                return "completed" if existing["status"] == "completed" else "pending"
            connection.execute(
                """
                INSERT INTO evaluations (
                    id, exam_id, question_number, answer_hash, question_hash, status, created_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
                """,
                (evaluation_id, exam_id, question_number, answer_hash, question_hash, datetime.now(UTC).isoformat()),
            )
            connection.commit()
        return "reserved"

    def get_completed_evaluation(
        self, *, exam_id: str, question_number: int, answer_hash: str, question_hash: str,
    ) -> StoredEvaluation | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT id, response_json FROM evaluations
                WHERE exam_id = ? AND question_number = ? AND answer_hash = ? AND question_hash = ?
                  AND status = 'completed'
                """,
                (exam_id, question_number, answer_hash, question_hash),
            ).fetchone()
        if not row or not row["response_json"]:
            return None
        return StoredEvaluation(id=str(row["id"]), response=json.loads(str(row["response_json"])))

    def get_completed_evaluation_by_id(
        self, *, evaluation_id: str, exam_id: str, question_number: int, answer_hash: str,
    ) -> StoredEvaluation | None:
        """Return the evidence the learner locked for this exact answer.

        This is intentionally independent of a later evaluator-contract hash:
        a completed answer must remain submit-ready even when scoring wording is
        improved after the learner has already paid for or run an evaluation.
        """
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT id, response_json FROM evaluations
                WHERE id = ? AND exam_id = ? AND question_number = ? AND answer_hash = ?
                  AND status = 'completed'
                """,
                (evaluation_id, exam_id, question_number, answer_hash),
            ).fetchone()
        if not row or not row["response_json"]:
            return None
        return StoredEvaluation(id=str(row["id"]), response=json.loads(str(row["response_json"])))

    def complete_evaluation(
        self, *, evaluation_id: str, response: dict[str, Any], artifact: bytes | None,
        artifact_media_type: str | None,
    ) -> None:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            updated = connection.execute(
                """
                UPDATE evaluations
                SET status = 'completed', response_json = ?, artifact_blob = ?, artifact_media_type = ?,
                    completed_at = ?
                WHERE id = ? AND status = 'pending'
                """,
                (
                    json.dumps(response, ensure_ascii=False), artifact, artifact_media_type,
                    datetime.now(UTC).isoformat(), evaluation_id,
                ),
            ).rowcount
            if updated != 1:
                connection.rollback()
                raise RuntimeError("AI-POT evaluation reservation was lost.")
            connection.commit()

    def abandon_evaluation(self, evaluation_id: str) -> None:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute("DELETE FROM evaluations WHERE id = ? AND status = 'pending'", (evaluation_id,))
            connection.commit()

    def artifact(self, evaluation_id: str) -> tuple[bytes, str] | None:
        with self._connect() as connection:
            row = connection.execute(
                """SELECT artifact_blob, artifact_media_type FROM evaluations
                   WHERE id = ? AND status = 'completed'""",
                (evaluation_id,),
            ).fetchone()
        if not row or row["artifact_blob"] is None:
            return None
        return bytes(row["artifact_blob"]), str(row["artifact_media_type"] or "application/octet-stream")

    def save_attempt(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                "SELECT * FROM attempts WHERE exam_id = ? AND client_submission_id = ?",
                (record["exam_id"], record["client_submission_id"]),
            ).fetchone()
            if existing:
                connection.commit()
                return self._attempt_row(existing)
            connection.execute(
                """
                INSERT INTO attempts (
                    id, exam_id, client_submission_id, exam_title, submitted_at, elapsed_seconds,
                    score, answered_count, reviews_json, chapters_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"], record["exam_id"], record["client_submission_id"], record["exam_title"],
                    record["submitted_at"], record["elapsed_seconds"], record["score"], record["answered_count"],
                    json.dumps(record["reviews"], ensure_ascii=False),
                    json.dumps(record["chapters"], ensure_ascii=False),
                ),
            )
            connection.commit()
        return record

    def get_attempt(self, attempt_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM attempts WHERE id = ?", (attempt_id,)).fetchone()
        return self._attempt_row(row) if row else None

    def list_attempts(self) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM attempts ORDER BY submitted_at DESC").fetchall()
        return [self._attempt_row(row) for row in rows]

    @staticmethod
    def _attempt_row(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": str(row["id"]),
            "exam_id": str(row["exam_id"]),
            "client_submission_id": str(row["client_submission_id"]),
            "exam_title": str(row["exam_title"]),
            "submitted_at": str(row["submitted_at"]),
            "elapsed_seconds": int(row["elapsed_seconds"]),
            "score": float(row["score"]),
            "answered_count": int(row["answered_count"]),
            "reviews": json.loads(str(row["reviews_json"])),
            "chapters": json.loads(str(row["chapters_json"])),
        }
