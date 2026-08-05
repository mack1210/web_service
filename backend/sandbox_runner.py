"""Tiny no-network Python execution service for AI-POT code evidence."""

from __future__ import annotations

import json
import os
import resource
import shutil
import subprocess
import sys
import tempfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from socket import AF_UNIX

SOCKET_PATH = Path(os.getenv("AIPOT_SANDBOX_SOCKET", "/aipot-sandbox/aipot-runner.sock"))
MAX_SOURCE = 100_000
MAX_OUTPUT = 32_000


class UnixHTTPServer(HTTPServer):
    address_family = AF_UNIX


def limits() -> None:
    resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
    resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1 * 1024 * 1024, 1 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    resource.setrlimit(resource.RLIMIT_NPROC, (16, 16))


class Runner(BaseHTTPRequestHandler):
    server_version = "AIPOTCodeRunner/1"

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def _send(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send(HTTPStatus.OK, {"ok": True})
        else:
            self._send(HTTPStatus.NOT_FOUND, {"message": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/run":
            self._send(HTTPStatus.NOT_FOUND, {"message": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(min(length, MAX_SOURCE + 4096)).decode("utf-8"))
            source = payload["source"]
            stdin = payload.get("stdin", "")
            if not isinstance(source, str) or not isinstance(stdin, str) or len(source) > MAX_SOURCE:
                raise ValueError
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            self._send(HTTPStatus.BAD_REQUEST, {"message": "Invalid runner input"})
            return
        workspace = tempfile.mkdtemp(prefix="aipot-")
        try:
            source_file = Path(workspace) / "candidate.py"
            source_file.write_text(source, encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, "-I", "-B", str(source_file)], input=stdin,
                text=True, capture_output=True, timeout=5, cwd=workspace,
                env={"PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf-8"},
                preexec_fn=limits,
            )
            self._send(HTTPStatus.OK, {
                "stdout": completed.stdout[:MAX_OUTPUT], "stderr": completed.stderr[:MAX_OUTPUT],
                "exit_code": completed.returncode,
            })
        except subprocess.TimeoutExpired as error:
            self._send(HTTPStatus.OK, {
                "stdout": (error.stdout or "")[:MAX_OUTPUT], "stderr": "Execution timed out.", "exit_code": -1,
            })
        finally:
            shutil.rmtree(workspace, ignore_errors=True)


def main() -> None:
    SOCKET_PATH.parent.mkdir(parents=True, exist_ok=True)
    if SOCKET_PATH.exists():
        SOCKET_PATH.unlink()
    server = UnixHTTPServer(str(SOCKET_PATH), Runner)
    os.chmod(SOCKET_PATH, 0o660)
    server.serve_forever()


if __name__ == "__main__":
    main()
