from sqlalchemy.engine import URL

from app.core.config import Settings


def test_database_url_preserves_reserved_password_characters():
    password = "p@ss:word/with#reserved?characters"
    settings = Settings(
        _env_file=None,
        DATABASE_URL="",
        POSTGRES_HOST="db",
        POSTGRES_PORT=5432,
        POSTGRES_USER="fubito",
        POSTGRES_PASSWORD=password,
        POSTGRES_DB="fubito",
    )

    url = settings.database_connection_url()

    assert isinstance(url, URL)
    assert url.host == "db"
    assert url.password == password
    assert url.database == "fubito"

