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


class AipotNotFoundError(AppError):
    def __init__(self, message: str = "The requested AI-POT study resource was not found.") -> None:
        super().__init__(code="aipot_not_found", message=message, status_code=404)


class AipotContentUnavailableError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="aipot_content_unavailable",
            message="AI-POT study materials are not available. Check the local content mount.",
            status_code=503,
            retryable=False,
        )


class AipotEvaluationUnavailableError(AppError):
    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(
            code="aipot_evaluation_unavailable",
            message=message,
            status_code=503,
            retryable=retryable,
        )


class AipotEvaluationRequiredError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(
            code="aipot_evaluation_required",
            message=message,
            status_code=409,
            retryable=True,
        )


class AipotMediaConfirmationRequiredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="aipot_media_confirmation_required",
            message="이미지 생성·평가를 진행하려면 확인 창에서 ‘이미지 생성·평가’를 눌러 주세요.",
            status_code=409,
            retryable=False,
        )
