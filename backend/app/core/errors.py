from typing import Any, Optional

class AppException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Any] = None,
        error_code: str = "INTERNAL_ERROR"
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details
        self.error_code = error_code

class NotFoundException(AppException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found.",
            status_code=404,
            error_code="RESOURCE_NOT_FOUND"
        )

class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=422,
            details=details,
            error_code="VALIDATION_FAILED"
        )

class ConstraintViolationException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=400,
            details=details,
            error_code="CONSTRAINT_UNSATISFIABLE"
        )
