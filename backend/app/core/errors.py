from dataclasses import dataclass, field


@dataclass(slots=True)
class FieldIssue:
    field: str
    message: str


@dataclass(slots=True)
class AppError(Exception):
    code: str
    message: str
    status_code: int
    retryable: bool = False
    fields: list[FieldIssue] = field(default_factory=list)


class NotFoundError(AppError):
    def __init__(self, message: str = "The requested item was not found.") -> None:
        super().__init__(
            code="sample_not_found",
            message=message,
            status_code=404,
        )


class DependencyUnavailableError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="upstream_unavailable",
            message="A required sample source is temporarily unavailable.",
            status_code=503,
            retryable=True,
        )
