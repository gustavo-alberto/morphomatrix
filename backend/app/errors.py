"""Domain exceptions, mapped to HTTP responses in main.py."""


class NotFoundError(Exception):
    """A resource (matrix, row, column, ...) does not exist. Maps to 404."""

    def __init__(self, resource: str, resource_id: str) -> None:
        super().__init__(f"{resource} not found: {resource_id}")
        self.resource = resource
        self.resource_id = resource_id


class MatrixNotFoundError(NotFoundError):
    def __init__(self, matrix_id: str) -> None:
        super().__init__("Matrix", matrix_id)


class InvalidOperationError(Exception):
    """The request is well-formed but inconsistent with the matrix. Maps to 422."""


class PhotoTooLargeError(Exception):
    """Uploaded photo exceeds the size limit. Maps to 413."""


class UnsupportedPhotoTypeError(Exception):
    """Uploaded file is not a JPG/PNG image. Maps to 415."""
