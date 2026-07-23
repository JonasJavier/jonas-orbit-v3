import os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
django.setup()


def show(label, values):
    vals = [str(v) for v in values if v not in (None, "", "None")]
    print(f"\n=== {label} ({len(vals)}) ===")
    for v in sorted(set(vals)):
        print("  ", v)


from crm.models import Cliente

try:
    show("Cliente emails", Cliente.objects.values_list("email", flat=True))
except Exception as e:
    print("Cliente email ERR", e)
for fld in ("telefono", "celular", "movil", "phone"):
    try:
        show(f"Cliente.{fld}", Cliente.objects.values_list(fld, flat=True))
    except Exception:
        pass
try:
    show("Cliente nombres", [f"{getattr(c,'nombre','')} {getattr(c,'apellido','')}".strip() for c in Cliente.objects.all()])
except Exception as e:
    print("Cliente nombre ERR", e)

from django.contrib.auth import get_user_model

U = get_user_model()
show("User emails", U.objects.values_list("email", flat=True))
show("User telefonos", U.objects.values_list("telefono", flat=True))

try:
    from reservas.models import Supplier

    show("Supplier nombres", [getattr(s, "nombre", getattr(s, "name", str(s))) for s in Supplier.objects.all()])
except Exception as e:
    print("Supplier ERR", e)

try:
    from usuarios.models import CompanySettings

    for cs in CompanySettings.objects.all():
        print("\n=== CompanySettings ===")
        for f in cs._meta.fields:
            print("  ", f.name, "=", getattr(cs, f.name))
except Exception as e:
    print("CompanySettings ERR", e)
