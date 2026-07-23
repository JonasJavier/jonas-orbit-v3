import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
django.setup()
from django.contrib.auth import get_user_model

U = get_user_model()


def c(label, qs):
    try:
        print(f"{label}: {qs.count()}")
    except Exception as e:
        print(f"{label}: ERR {e}")


print("=== Users ===")
print("total users:", U.objects.count())
print("superusers:", U.objects.filter(is_superuser=True).count())
for u in U.objects.filter(is_superuser=True).values_list("username", "is_active")[:10]:
    print("  su:", u[0], "active=", u[1])
print("=== staff (non-super) sample ===")
for u in U.objects.filter(is_staff=True, is_superuser=False).values_list("username", "is_active")[:10]:
    print("  staff:", u[0], "active=", u[1])

from reservas.models import Reserva, Pago, Supplier, Hotel

c("Reservas", Reserva.objects.all())
c("Pagos", Pago.objects.all())
c("Suppliers", Supplier.objects.all())
c("Hoteles", Hotel.objects.all())
from crm.models import Cliente

c("Clientes", Cliente.objects.all())
from sucursales.models import Sucursal, Departamento

c("Sucursales", Sucursal.objects.all())
c("Departamentos", Departamento.objects.all())
try:
    from contabilidad.models import Invoice

    c("Invoices", Invoice.objects.all())
except Exception as e:
    print("Invoices ERR", e)
try:
    from ledger.models import JournalEntry

    c("JournalEntries", JournalEntry.objects.all())
except Exception as e:
    print("JournalEntries ERR", e)
try:
    from nomina.models import Employee

    c("Employees", Employee.objects.all())
except Exception as e:
    print("Employees ERR", e)
try:
    from divisas.models import Currency, ExchangeRate

    c("Currencies", Currency.objects.all())
    c("ExchangeRates", ExchangeRate.objects.all())
except Exception as e:
    print("Divisas ERR", e)
