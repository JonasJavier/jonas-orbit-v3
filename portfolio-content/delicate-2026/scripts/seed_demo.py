"""Crea una base LOCAL y desechable de Delicaté con datos demo para las capturas.

No toca la base ni las fotos del repositorio: todo va a DEMO_STATE_DIR
(por defecto %TEMP%/delicate-portfolio-demo). Se ejecuta con el Python del
entorno virtual de Delicaté:

    <repo>/.venv/Scripts/python.exe seed_demo.py

Datos que siembra (todos ficticios):
- Los 10 productos del comando oficial `seed_products --reset`.
- "Flor de Ámbar" con existencias 0, para mostrar el estado «Agotado».
- 4 mensajes de contacto y 3 suscripciones con correos @example.com.
- Un administrador demo (credenciales abajo) sólo para esta base local.
"""

import os
import sys
import tempfile
from pathlib import Path

REPO = Path(os.environ.get("DELICATE_REPO", "C:/Users/savage/Documents/GitHub/Delicate-4.0"))
STATE = Path(os.environ.get("DEMO_STATE_DIR", Path(tempfile.gettempdir()) / "delicate-portfolio-demo"))

# Credenciales de la cuenta demo local; no existen en producción.
DEMO_ADMIN_EMAIL = "demo-admin@delicate.test"
DEMO_ADMIN_PASSWORD = "DemoDelicate-2026!local"

STATE.mkdir(parents=True, exist_ok=True)
# Esta PC tiene variables DJANGO_* globales de otro proyecto; se descartan para
# que la demo use sólo la configuración por defecto de Delicaté.
for key in list(os.environ):
    if key.startswith(("DJANGO_", "CSRF_", "CORS_", "RAILWAY_")) or key == "DATABASE_URL":
        del os.environ[key]
os.environ["DJANGO_DB_PATH"] = str((STATE / "demo.sqlite3").resolve())
os.environ["DJANGO_MEDIA_ROOT"] = str((STATE / "media").resolve())
os.environ["DJANGO_DEBUG"] = "True"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
sys.path.insert(0, str(REPO / "backend"))

import django  # noqa: E402

django.setup()

from django.core.management import call_command  # noqa: E402

from accounts.models import CustomUser  # noqa: E402
from contact.models import ContactMessage, NewsletterSubscription  # noqa: E402
from shop.models import Product  # noqa: E402

call_command("migrate", verbosity=0)
call_command("seed_products", "--reset")

Product.objects.filter(slug="flor-de-ambar").update(stock=0)

ContactMessage.objects.all().delete()
ContactMessage.objects.bulk_create([
    ContactMessage(name="Laura Méndez", email="laura.mendez@example.com", phone="809-555-0142",
                   subject="Recuerdos para bautizo",
                   message="Busco 30 jabones pequeños en forma de corazón para un bautizo en noviembre.",
                   status=ContactMessage.Status.NEW),
    ContactMessage(name="Carlos Peña", email="carlos.pena@example.com", phone="",
                   subject="Piel sensible",
                   message="¿Qué jabón recomiendan para piel muy sensible y seca? Gracias.",
                   status=ContactMessage.Status.CONTACTED),
    ContactMessage(name="Ana Rosario", email="ana.rosario@example.com", phone="829-555-0187",
                   subject="Regalos corporativos",
                   message="Quisiera cotizar 50 cajas de regalo para el equipo de la oficina.",
                   status=ContactMessage.Status.NEW),
    ContactMessage(name="Miguel Santos", email="miguel.santos@example.com", phone="",
                   subject="Entrega en Santiago",
                   message="¿Hacen entregas en Santiago o solo en Santo Domingo?",
                   status=ContactMessage.Status.CLOSED),
])

NewsletterSubscription.objects.all().delete()
for email in ("sofia.demo@example.com", "pedro.demo@example.com", "carmen.demo@example.com"):
    NewsletterSubscription.objects.create(email=email)

admin, _ = CustomUser.objects.get_or_create(
    email=DEMO_ADMIN_EMAIL, defaults={"is_staff": True, "is_superuser": True}
)
admin.is_staff = admin.is_superuser = True
admin.set_password(DEMO_ADMIN_PASSWORD)
admin.save()

print(f"Base demo lista en {STATE}")
print(f"Productos activos: {Product.objects.filter(is_active=True).count()} · "
      f"mensajes: {ContactMessage.objects.count()} · suscripciones: {NewsletterSubscription.objects.count()}")
