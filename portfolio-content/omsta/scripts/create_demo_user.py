import os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
django.setup()
from django.contrib.auth import get_user_model

U = get_user_model()
USERNAME = "demo_portafolio"
PASSWORD = "OmstaDemo2026!portfolio"

u, created = U.objects.get_or_create(
    username=USERNAME,
    defaults={"email": "demo.portafolio@example.test"},
)
u.is_staff = True
u.is_superuser = True
u.is_active = True
u.rol = "superadmin"
u.first_name = "Demo"
u.last_name = "Portafolio"
u.set_password(PASSWORD)
u.save()
print("created" if created else "updated", "->", u.username, "| superuser=", u.is_superuser, "| rol=", u.rol)
