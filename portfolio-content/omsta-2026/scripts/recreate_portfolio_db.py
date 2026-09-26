# portfolio-content/omsta-2026/scripts/recreate_portfolio_db.py
"""Borra y vuelve a crear la BD local omsta_portfolio (y sólo esa).

Usa las credenciales del Postgres LOCAL que ya definen los settings de OMSTA;
no imprime ninguna. Aborta si el host no es local.
"""
import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
os.environ["USE_REDIS_CACHE"] = "False"
import django  # noqa: E402

django.setup()
import psycopg  # noqa: E402
from django.conf import settings  # noqa: E402

NOMBRE = "omsta_portfolio"
db = settings.DATABASES["default"]
assert db["HOST"] in ("127.0.0.1", "localhost"), "host no local: abortar"
conn = psycopg.connect(
    host=db["HOST"], port=db["PORT"], user=db["USER"], password=db["PASSWORD"],
    dbname="postgres", autocommit=True,
)
with conn.cursor() as cur:
    cur.execute(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
        [NOMBRE],
    )
    cur.execute(f'DROP DATABASE IF EXISTS "{NOMBRE}"')
    cur.execute(f'CREATE DATABASE "{NOMBRE}"')
print(f"{NOMBRE} recreada")
