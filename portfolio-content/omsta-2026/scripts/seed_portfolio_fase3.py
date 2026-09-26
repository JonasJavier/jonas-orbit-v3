# portfolio-content/omsta-2026/scripts/seed_portfolio_fase3.py
"""Tercera fase de la siembra sintética (BD local omsta_portfolio).

- RNC ficticio de la empresa y de los suplidores (000000xxx: no existen);
- documento fiscal del suplidor (base del DGII 606) para cada viaje ya
  facturado, publicado por la vista real, y el pago al suplidor aplicado a ese
  documento (así la CxP y su cuenta control cuadran);
- nombres creíbles de sucursales, empleados, usuarios de nómina y períodos
  (las semillas del repo usan «Demo» / «nomina_demo_XX»);
- configuración contable de nómina con el mismo servicio del botón
  «Crear cuentas base y autoconfigurar».

Aborta si la BD no es omsta_portfolio.
"""
from __future__ import annotations

import os
import sys
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
import django  # noqa: E402

django.setup()
from django.test.utils import setup_test_environment  # noqa: E402

setup_test_environment()

from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.test import Client  # noqa: E402
from django.urls import reverse  # noqa: E402
from django.utils import timezone  # noqa: E402

assert settings.DATABASES["default"]["NAME"] == "omsta_portfolio", "BD equivocada: abortar"
assert settings.DATABASES["default"]["HOST"] in ("127.0.0.1", "localhost"), "host no local"

D = Decimal
User = get_user_model()
HOY = timezone.localdate()
CONTABLE = User.objects.get(username="demo.contabilidad")
errores: list[str] = []


def cliente_web():
    c = Client(SERVER_NAME="localhost")
    c.force_login(CONTABLE)
    return c


def datos_de(form) -> dict:
    data = {}
    for nombre in form.fields:
        valor = form[nombre].value()
        if valor in (None, "") or isinstance(valor, list):
            continue
        data[nombre] = valor.pk if hasattr(valor, "pk") else valor
    return data


def errores_de(resp):
    ctx = resp.context
    if ctx and "form" in ctx:
        return dict(ctx["form"].errors)
    return resp.status_code


# ── 1. Identidad fiscal ficticia ──────────────────────────────────────────
def identidad_fiscal():
    from reservas.models import Supplier
    from usuarios.models import CompanySettings

    empresa = CompanySettings.load()
    if not empresa.rnc:
        empresa.rnc = "000000000"
        empresa.save()
    for i, s in enumerate(Supplier.objects.order_by("pk"), start=1):
        if not s.rnc:
            s.rnc = f"000000{100 + i}"
            s.save(update_fields=["rnc"])
    print("· RNC ficticios asignados")


# ── 2. Documento fiscal del suplidor + pago aplicado ──────────────────────
def documentos_y_pagos_suplidor():
    from catalogs.constants import SystemCatalogs
    from catalogs.models import CatalogItem
    from contabilidad.models import AccountsPayable
    from divisas.models import Currency

    client = cliente_web()
    url_doc = reverse("contabilidad:reservation_supplier_bill_create")
    url_pago = reverse("contabilidad:supplier_payment_create")
    banco = CatalogItem.objects.filter(group__code=SystemCatalogs.BANK, name__iexact="Banreservas").first()
    dop = Currency.objects.get(code="DOP")
    hechos = 0
    for n, cxp in enumerate(AccountsPayable.objects.filter(reserva__invoice__isnull=False).order_by("pk"), start=1):
        if cxp.reservation_supplier_bills.exists():
            continue
        reserva = cxp.reserva
        # Documento fiscal (NCF B01 ficticio) publicado en el mayor.
        resp = client.get(url_doc, {"payable_id": cxp.pk})
        data = datos_de(resp.context["form"])
        total = D(str(cxp.amount))
        servicios = (total / D("1.18")).quantize(D("0.01"), rounding=ROUND_HALF_UP)
        suplidor = cxp.supplier or getattr(cxp.hotel, "supplier", None)
        if suplidor is None:
            # Vuelo y excursión no tienen suplidor en la reserva: se registra
            # quien emite el comprobante (consolidador u operador), ficticio.
            from reservas.models import Supplier

            aereo = getattr(reserva, "tipo", "") == "flight"
            nombre = "Consolidador Aéreo del Caribe" if aereo else "Excursiones Costa Este"
            suplidor, _ = Supplier.objects.get_or_create(
                name=nombre,
                defaults={
                    "legal_name": f"{nombre} SRL",
                    "supplier_type": (Supplier.SupplierTypeChoices.AGENCY if aereo
                                      else Supplier.SupplierTypeChoices.TOUR_OPERATOR),
                    "email": f"facturas@{'consolidador' if aereo else 'excursiones'}.example.com",
                    "phone": "+18095552100",
                    "rnc": f"000000{200 + n}",
                },
            )
        fin = getattr(reserva, "fecha_salida", None) or (HOY - timedelta(days=5))
        data.update(
            supplier=suplidor.pk if suplidor else "",
            bill_date=(fin if fin <= HOY else HOY).isoformat(),
            ncf=f"B01{90000000 + n:08d}",
            supplier_invoice_number=f"F-2026-{400 + n}",
            dgii_purchase_type="02",
            dgii_services_amount=str(servicios),
            dgii_goods_amount="0",
            dgii_itbis_facturado=str(total - servicios),
            notes="Factura del proveedor por la estadía",
            action="post",
        )
        resp = client.post(url_doc + f"?payable_id={cxp.pk}", data)
        bill = cxp.reservation_supplier_bills.order_by("-pk").first()
        if bill is None:
            errores.append(f"documento suplidor CxP {cxp.pk}: {errores_de(resp)}")
            continue
        # Pago al suplidor aplicado a ese documento.
        resp = client.get(url_pago, {"payable_id": cxp.pk, "reservation_bill_id": bill.pk})
        form = resp.context["form"]
        data = datos_de(form)
        metodo = next((c for c, label in form.fields["method"].choices if "ransfer" in str(label)), None)
        data.update(
            payable=cxp.pk, method=getattr(metodo, "value", metodo), amount=str(total),
            date=HOY.isoformat(), reference=f"PF-SUP-{cxp.pk}", comments="Pago al suplidor tras el viaje",
            bank=banco.pk if banco else "", bank_transaction_code=f"PSUP{uuid4().hex[:8].upper()}",
            bank_description="Pago a suplidor", disbursement_currency=dop.pk, disbursement_amount=str(total),
        )
        resp = client.post(url_pago + f"?payable_id={cxp.pk}&reservation_bill_id={bill.pk}", data)
        if resp.status_code in (301, 302):
            hechos += 1
        else:
            errores.append(f"pago suplidor CxP {cxp.pk}: {errores_de(resp)}")
    print(f"· Documentos fiscales de suplidor + pagos: {hechos}")


# ── 3. Nombres creíbles ───────────────────────────────────────────────────
def nombres():
    from nomina.models import Employee, PayrollPeriod, VacationRecord
    from sucursales.models import Sucursal

    for codigo, nuevo, nombre, tel in (("DEMO-SDQ", "SDQ", "Sucursal Santo Domingo", "+1 809 555 0100"),
                                       ("DEMO-STI", "STI", "Sucursal Santiago", "+1 809 555 0200")):
        Sucursal.objects.filter(codigo=codigo).update(codigo=nuevo, nombre=nombre, telefono=tel,
                                                     email=f"{nuevo.lower()}@example.com")
    for e in Employee.objects.select_related("user").order_by("pk"):
        if e.codigo_empleado.startswith("EMP-DEMO-"):
            e.codigo_empleado = e.codigo_empleado.replace("EMP-DEMO-", "EMP-")
            e.save(update_fields=["codigo_empleado"])
        u = e.user
        if u and u.username.startswith("nomina_demo_"):
            base = f"{u.first_name}.{u.last_name.split()[0]}".lower()
            for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n"), (" ", "")):
                base = base.replace(a, b)
            User.objects.filter(pk=u.pk).update(username=base, email=f"{base}@example.com")
    mes = {1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio", 7: "julio",
           8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"}
    for p in PayrollPeriod.objects.filter(codigo__startswith="PER-DEMO"):
        p.codigo = f"NOM-{p.fecha_inicio:%Y-%m}"
        p.nombre = f"Nómina {mes[p.fecha_inicio.month]} {p.fecha_inicio.year}"
        p.save(update_fields=["codigo", "nombre"])
    VacationRecord.objects.filter(comentario__icontains="demo").update(comentario="Vacaciones programadas")
    print("· Nombres de sucursales, empleados y períodos actualizados")


# ── 4. Contabilidad de nómina (botón «Crear cuentas base y autoconfigurar») ─
def contabilidad_nomina():
    try:
        from nomina.services_ledger import ensure_posting_config

        ensure_posting_config()  # lo mismo que hace nomina/views/posting_config.py:44
        print("· Contabilidad de nómina configurada")
    except Exception as exc:  # noqa: BLE001
        errores.append(f"contabilidad nómina: {exc}")


if __name__ == "__main__":
    for paso in (identidad_fiscal, documentos_y_pagos_suplidor, nombres, contabilidad_nomina):
        paso()
    print(f"Errores: {len(errores)}")
    for e in errores:
        print("  ✗", e)
