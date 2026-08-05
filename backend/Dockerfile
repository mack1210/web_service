FROM python:3.13-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
RUN pip install --no-cache-dir uv==0.11.7

FROM base AS dev-deps
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --group dev

FROM dev-deps AS dev
COPY app ./app
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS prod-deps
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.13-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"
RUN groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app --create-home app \
  && mkdir -p /app/data \
  && chown app:app /app/data
COPY --from=prod-deps /app/.venv /app/.venv
COPY --chown=app:app app ./app
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.13-slim AS aipot-sandbox
WORKDIR /runner
RUN groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app --create-home app \
  && mkdir -p /aipot-sandbox \
  && chown app:app /aipot-sandbox
COPY --chown=app:app sandbox_runner.py ./sandbox_runner.py
USER app
CMD ["python", "/runner/sandbox_runner.py"]
