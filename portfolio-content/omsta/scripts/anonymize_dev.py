import os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
django.setup()

# 1) CompanySettings: neutralizar identidad fiscal real -> ficticia
from usuarios.models import CompanySettings

cs = CompanySettings.objects.first()
if cs:
    print("CompanySettings ANTES:", cs.company_name, "|", getattr(cs, "legal_name", ""), "| rnc=", cs.rnc, "| tel=", cs.phone, "| email=", cs.email)
    cs.company_name = "Cristecno Viajes"
    if hasattr(cs, "legal_name"):
        cs.legal_name = "Cristecno Viajes SRL"
    cs.rnc = "131999999"
    cs.phone = "+1 (809) 555-0100"
    cs.email = "reservas@cristecnoviajes.demo"
    cs.save()
    print("CompanySettings DESPUES:", cs.company_name, "| rnc=", cs.rnc, "| tel=", cs.phone, "| email=", cs.email)

# 2) Cliente potencialmente real -> anonimizar
from crm.models import Cliente

for cli in Cliente.objects.filter(nombre__icontains="Brayan"):
    print("Cliente ANTES:", cli.pk, cli.nombre, cli.apellido, "| ced=", cli.cedula_pasaporte, "| email=", cli.email)
    cli.nombre = "Luis"
    cli.apellido = "Demo Portafolio"
    if cli.cedula_pasaporte:
        cli.cedula_pasaporte = "000-0000000-0"
    if cli.email:
        cli.email = "cliente.demo@example.test"
    cli.save()
    print("Cliente DESPUES:", cli.pk, cli.nombre, cli.apellido)

# 3) Usuario con email de proveedor real -> ficticio
from django.contrib.auth import get_user_model

U = get_user_model()
for u in U.objects.filter(email__iexact="jara@hotmail.com"):
    print("User ANTES:", u.username, u.email)
    u.email = "jara@example.test"
    u.save()
    print("User DESPUES:", u.username, u.email)

# 4) Revisar Empresas CRM (razon social / RNC) por si hay datos reales
from crm.models import Empresa

print("\n=== Empresas CRM ===")
for e in Empresa.objects.all():
    print("  ", e.pk, "|", e.nombre_comercial, "|", e.razon_social, "| rnc=", e.rnc, "| tel=", getattr(e, "telefono", ""))
