import io
import warnings

from PIL import Image, UnidentifiedImageError
from pillow_heif import register_heif_opener

from app.core.errors import AppException

register_heif_opener()
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
IMAGE_FORMATS = {'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP',
                 'image/heic': 'HEIF', 'image/heif': 'HEIF'}


def validate_image(data: bytes, mime_type: str) -> tuple[bytes, str]:
    if len(data) >= MAX_IMAGE_BYTES:
        raise AppException('Choose an image smaller than 10 MB.', 413, error_code='IMAGE_TOO_LARGE')
    if mime_type not in IMAGE_FORMATS:
        raise AppException('Use a JPEG, PNG, WebP, or HEIC image.', 415, error_code='IMAGE_TYPE_UNSUPPORTED')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format != IMAGE_FORMATS[mime_type] or image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValueError('Image format or dimensions are invalid')
                image.verify()
            # Decode as well as checking the container; truncated pixel data must not reach vision.
            with Image.open(io.BytesIO(data)) as image:
                image.load()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise AppException('This image could not be read. Upload a clear photo under 25 megapixels.',
                           422, error_code='IMAGE_INVALID') from exc
    return data, mime_type
