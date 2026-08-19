import os
import uuid

import requests

from app.core.config import settings


def _guess_extension(filename: str | None, content_type: str | None) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    if content_type == "image/png":
        return "png"
    if content_type == "image/webp":
        return "webp"
    return "jpg"


def _supabase_enabled() -> bool:
    return bool(settings.SUPABASE_URL and _supabase_key())


def _supabase_key() -> str:
    return settings.SUPABASE_SECRET_KEY or settings.SUPABASE_SERVICE_ROLE_KEY


def save_upload(
    *,
    content: bytes,
    filename: str | None,
    content_type: str | None,
    prefix: str,
) -> str:
    ext = _guess_extension(filename, content_type)
    safe_name = prefix.strip("/").replace("/", "_") or "upload"
    object_name = f"{safe_name}_{uuid.uuid4().hex}.{ext}"

    if _supabase_enabled():
        return _save_supabase_upload(
            content=content,
            content_type=content_type,
            object_name=object_name,
            prefix=prefix,
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    local_path = os.path.join(settings.UPLOAD_DIR, object_name)
    with open(local_path, "wb") as f:
        f.write(content)
    return f"/uploads/{object_name}"


def _save_supabase_upload(
    *,
    content: bytes,
    content_type: str | None,
    object_name: str,
    prefix: str,
) -> str:
    base_url = settings.SUPABASE_URL.rstrip("/")
    bucket = settings.SUPABASE_STORAGE_BUCKET
    supabase_key = _supabase_key()
    object_path = f"{prefix}/{object_name}"
    upload_url = f"{base_url}/storage/v1/object/{bucket}/{object_path}"

    response = requests.post(
        upload_url,
        data=content,
        headers={
            "apikey": supabase_key,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "false",
        },
        timeout=20,
    )
    response.raise_for_status()

    return f"{base_url}/storage/v1/object/public/{bucket}/{object_path}"
