from pathlib import Path
from urllib.parse import urlsplit
from starlette.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException
from app.core.database import SessionLocal
from app.models.reservation import Reservation


def is_receipt(path: str) -> bool:
    name = Path(path).name
    if name.startswith("yape_"):
        return True
    with SessionLocal() as db:
        urls = db.query(Reservation.yape_screenshot_url).filter(
            Reservation.yape_screenshot_url.isnot(None),
        ).all()
        return any(Path(urlsplit(row[0]).path).name == name for row in urls)


class PublicUploads(StaticFiles):
    async def get_response(self, path, scope):
        if await run_in_threadpool(is_receipt, path):
            raise HTTPException(404)
        return await super().get_response(path, scope)
