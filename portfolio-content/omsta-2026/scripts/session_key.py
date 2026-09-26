# portfolio-content/omsta-2026/scripts/session_key.py
"""Imprime una clave de sesión de Django para un usuario de la BD de portafolio.

Evita teclear contraseñas en el navegador de captura: Playwright inyecta la
cookie ``sessionid`` y navega directo. Correr desde la raíz del repo OMSTA con
el entorno de ``portfolio-env.ps1`` cargado:

    python <ruta>/session_key.py demo.admin
"""
import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
import django  # noqa: E402

django.setup()
from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.test import Client  # noqa: E402

assert settings.DATABASES["default"]["NAME"] == "omsta_portfolio", "BD equivocada"
user = get_user_model().objects.get(username=sys.argv[1] if len(sys.argv) > 1 else "demo.admin")
client = Client(SERVER_NAME="localhost")
client.force_login(user)
print(client.cookies[settings.SESSION_COOKIE_NAME].value)
