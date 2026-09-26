"""Crea la base demo LOCAL y desechable de Izak's Photos para las capturas.

- Base SQLite en %TEMP%/izaks-portfolio-demo/demo.sqlite3 (o IZAK_DEMO_DIR).
- Nunca toca backend/db.sqlite3 del repo ni ninguna base remota.
- 8 solicitudes de reserva ficticias (correos @example.com, teléfonos 555).
- Un superusuario demo que sólo existe en esta base local.

Uso (con un Python que tenga requirements.txt del repo instalado):
    python seed_demo.py
Variables opcionales: IZAK_REPO (ruta del repo), IZAK_DEMO_DIR (carpeta de la base).
"""
import os
import sys
import tempfile
from datetime import timedelta
from pathlib import Path

REPO = Path(os.environ.get("IZAK_REPO", r"C:\Users\savage\Documents\GitHub\IZAK-S-PHOTOS"))
DEMO_DIR = Path(os.environ.get("IZAK_DEMO_DIR", Path(tempfile.gettempdir()) / "izaks-portfolio-demo"))
DB = DEMO_DIR / "demo.sqlite3"

# Credenciales del admin demo. Sólo existen en la base local desechable.
ADMIN_USER = "demo-admin"
ADMIN_PASSWORD = "IzakDemo-2026!local"


def demo_env() -> None:
    """Fija un entorno aislado; ignora cualquier DJANGO_* global de esta PC."""
    for key in [k for k in os.environ if k.startswith("DJANGO_")] + ["DATABASE_URL"]:
        os.environ.pop(key, None)
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{DB.as_posix()}",
            "DJANGO_DEBUG": "true",
            "DJANGO_SECRET_KEY": "portfolio-demo-only-not-a-real-secret-2026",
            "DJANGO_ALLOWED_HOSTS": "localhost,127.0.0.1",
            "DJANGO_SETTINGS_MODULE": "backend.settings",
        }
    )


INQUIRIES = [
    # (nombre, correo, teléfono, sesión, fecha, lugar, referencia, mensaje, atendida, hace_dias)
    ("Laura Méndez", "laura.mendez@example.com", "+1 (809) 555-0101", "Portrait Session", "October 18, 2026", "Zona Colonial", "Instagram",
     "Retratos para mi nueva web de arquitecta. Me gustaría luz de tarde y algo de calle.", False, 0),
    ("Carlos y Ana", "carlos.ana@example.com", "+1 (829) 555-0144", "Wedding & Events", "March 6, 2027", "Punta Cana", "Referral",
     "Boda pequeña en la playa, unas 60 personas. Nos interesa la opción de dos fotógrafos.", False, 1),
    ("Estudio Nómada", "hola@estudionomada.example.com", "", "Brand Editorial", "Flexible, November", "Santiago", "Google",
     "Lanzamiento de una línea de mochilas. Necesitamos fotos de producto y de campaña.", False, 2),
    ("Mariel Santos", "mariel.santos@example.com", "+1 (849) 555-0172", "Portrait Session", "Flexible", "Santo Domingo", "Instagram",
     "Sesión de maternidad en exterior, idealmente en un jardín.", True, 4),
    ("Tomás Reyes", "tomas.reyes@example.com", "", "Brand Editorial", "October 30, 2026", "Santo Domingo", "Event",
     "Retratos de equipo para una startup de 12 personas, en nuestra oficina.", True, 6),
    ("Isabel y Diego", "isabel.diego@example.com", "+1 (809) 555-0190", "Wedding & Events", "December 12, 2026", "Jarabacoa", "Referral",
     "Elopement en la montaña con ceremonia al amanecer. ¿Viajas fuera de la capital?", True, 9),
    ("Nadia Pérez", "nadia.perez@example.com", "", "Portrait Session", "Flexible", "Santo Domingo", "Google",
     "Fotos para mi portafolio de danza, con movimiento y telas.", False, 12),
    ("Galería Luz Norte", "prensa@luznorte.example.com", "+1 (809) 555-0133", "Brand Editorial", "January 2027", "Santo Domingo", "Event",
     "Cobertura editorial para la inauguración de una exposición.", True, 15),
]


def main() -> None:
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    demo_env()
    sys.path.insert(0, str(REPO / "backend"))

    import django

    django.setup()

    from django.contrib.auth import get_user_model
    from django.core.management import call_command
    from django.utils import timezone

    from api.models import BookingInquiry

    call_command("migrate", "--noinput", verbosity=0)

    BookingInquiry.objects.all().delete()
    now = timezone.now()
    for i, (name, email, phone, kind, date, place, referral, message, handled, days_ago) in enumerate(INQUIRIES):
        inquiry = BookingInquiry.objects.create(
            name=name,
            email=email,
            phone=phone,
            project_type=kind,
            preferred_date=date,
            location=place,
            referral=referral,
            message=message,
            is_handled=handled,
        )
        # created_at es auto_now_add: se fecha después para tener un historial realista.
        BookingInquiry.objects.filter(pk=inquiry.pk).update(created_at=now - timedelta(days=days_ago, hours=i * 3))

    User = get_user_model()
    User.objects.filter(username=ADMIN_USER).delete()
    User.objects.create_superuser(ADMIN_USER, "demo-admin@example.com", ADMIN_PASSWORD)

    print(f"Base demo: {DB}")
    print(f"Solicitudes: {BookingInquiry.objects.count()} ({BookingInquiry.objects.filter(is_handled=True).count()} atendidas)")
    print(f"Admin local: {ADMIN_USER} (contraseña en este script)")


if __name__ == "__main__":
    main()
