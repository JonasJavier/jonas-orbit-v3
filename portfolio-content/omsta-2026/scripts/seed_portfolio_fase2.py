# portfolio-content/omsta-2026/scripts/seed_portfolio_fase2.py
"""Segunda fase de la siembra sintética (BD local omsta_portfolio).

Corre después de seed_portfolio.py y, como ella, pasa por los servicios y las
vistas reales de OMSTA:

- crucero, dos paquetes y un seguro con ``movil.services.alta_reserva.guardar``;
- localizador del proveedor en varias reservas (el motor de estados las pasa a
  «Confirmada» al guardarlas);
- cobros por transferencia con banco (``movil.services.pagos.registrar`` +
  ``apply_customer_payment``), que generan el movimiento bancario;
- pagos a suplidor de los viajes ya realizados por la vista real
  ``contabilidad:supplier_payment_create`` (cliente de pruebas de Django);
- tres empresas en el CRM;
- una anulación con ``reservas.services.cancellation.liquidar_cancelacion``.

Es idempotente en lo razonable: marca lo creado con referencias ``PF-…`` y no lo
repite. Aborta si la BD no es omsta_portfolio.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
import django  # noqa: E402

django.setup()
from django.test.utils import setup_test_environment  # noqa: E402

setup_test_environment()  # para leer response.context del cliente de pruebas

from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.test import Client, RequestFactory  # noqa: E402
from django.urls import reverse  # noqa: E402
from django.utils import timezone  # noqa: E402

assert settings.DATABASES["default"]["NAME"] == "omsta_portfolio", "BD equivocada: abortar"
assert settings.DATABASES["default"]["HOST"] in ("127.0.0.1", "localhost"), "host no local"

from contabilidad.services.payment_review import apply_customer_payment  # noqa: E402
from crm.models import Cliente, Empresa  # noqa: E402
from divisas.models import Currency  # noqa: E402
from movil.services import alta_reserva, pagos  # noqa: E402
from reservas.models import Pago, Reserva  # noqa: E402

D = Decimal
User = get_user_model()
HOY = timezone.localdate()
ASESOR = User.objects.get(username="demo.reservas")
CONTABLE = User.objects.get(username="demo.contabilidad")
ADMIN = User.objects.get(username="demo.admin")
DOP = Currency.objects.get(code="DOP")
errores: list[str] = []


def peticion(user):
    request = RequestFactory().post("/", HTTP_HOST="localhost")
    request.user = user
    return request


def fecha(dias: int) -> str:
    return (HOY + timedelta(days=dias)).isoformat()


def momento(dias: int, hora: int) -> str:
    return (datetime.combine(HOY + timedelta(days=dias), datetime.min.time()) + timedelta(hours=hora)).strftime("%Y-%m-%dT%H:%M")


def cliente(nombre, apellido, cedula, telefono):
    email = f"{nombre}.{apellido.split()[0]}@example.com".lower()
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
        email = email.replace(a, b)
    obj, _ = Cliente.objects.get_or_create(
        cedula_pasaporte=cedula,
        defaults={"nombre": nombre, "apellido": apellido, "email": email,
                  "telefono": f"+1{telefono}", "direccion_fisica": "Santiago, República Dominicana"},
    )
    return obj


def viajero(c, tipo_campo="passenger_type"):
    return {tipo_campo: "adult", "first_name": c.nombre, "last_name": c.apellido}


def acompanante(c, nombre):
    return {"passenger_type": "adult", "first_name": nombre, "last_name": c.apellido}


def guardar(tipo, cli, valores, filas):
    if Reserva.objects.filter(cliente=cli).exists():
        return Reserva.objects.filter(cliente=cli).first()
    base = {"cliente": str(cli.pk), "empresa": "", "moneda": str(DOP.pk),
            "next_payment_method": "date", "discount_mode": "percentage", "payment_plan_enabled": False}
    resultado = alta_reserva.guardar(tipo, {"valores": {**base, **valores}, "filas": filas}, request=peticion(ASESOR))
    if not resultado["valido"]:
        errores.append(f"{tipo} {cli}: {resultado['errores']}")
        return None
    reserva = Reserva.objects.get(pk=resultado["reserva_id"])
    print(f"· Reserva {reserva.pk} ({tipo}) {cli}")
    return reserva


def comprobante(reserva, monto):
    """Imagen SINTÉTICA de comprobante, subida como adjunto temporal (flujo de la app)."""
    from io import BytesIO

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (900, 560), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 900, 90], fill=(20, 60, 110))
    d.text((30, 30), "COMPROBANTE DE TRANSFERENCIA - DEMO (datos ficticios)", fill="white")
    lineas = [f"Reserva: #{reserva.pk}", f"Monto: RD$ {monto:,.2f}", f"Fecha: {HOY:%d/%m/%Y}",
              "Banco: Banco Demo", "Referencia: " + uuid4().hex[:10].upper()]
    for i, t in enumerate(lineas):
        d.text((40, 130 + i * 60), t, fill=(30, 30, 30))
    buf = BytesIO()
    img.save(buf, "PNG")
    archivo = SimpleUploadedFile(f"comprobante-{reserva.pk}.png", buf.getvalue(), content_type="image/png")
    return alta_reserva.subir_adjunto(archivo, user=ASESOR)


def abonar(reserva, fraccion, *, metodo="cash", aplicar=True, banco=None):
    reserva.refresh_from_db()
    if fraccion is None:
        pagado = sum((p.monto for p in Pago.objects.valid().filter(reserva=reserva)), D("0"))
        monto = reserva.total - pagado
    else:
        monto = reserva.total * fraccion
    monto = monto.quantize(D("0.01"), rounding=ROUND_HALF_UP)
    if monto <= 0:
        return
    valores = {"monto": str(monto), "metodo_pago": metodo,
               "referencia": f"PF-{reserva.pk}-{uuid4().hex[:6].upper()}", "confirm_duplicate": True}
    if banco is not None:
        valores.update(bank=str(banco.pk), bank_transaction_code=f"TRX{uuid4().hex[:8].upper()}",
                       bank_description="Transferencia del cliente")
    entrada = {"valores": valores, "idempotency_key": uuid4().hex}
    if banco is not None:
        adj = comprobante(reserva, monto)
        entrada["adjuntos"] = [adj.get("id") or adj.get("token") or adj.get("pk")]
    try:
        r = pagos.registrar(reserva, entrada, request=peticion(ASESOR))
        if aplicar:
            apply_customer_payment(Pago.objects.get(pk=r["pago_id"]), user=CONTABLE)
    except Exception as exc:  # noqa: BLE001
        errores.append(f"abono {metodo} reserva {reserva.pk}: {exc}")


def banco_dop():
    from catalogs.constants import SystemCatalogs
    from catalogs.models import CatalogItem

    return (CatalogItem.objects.filter(group__code=SystemCatalogs.BANK, name__iexact="Banreservas").first()
            or CatalogItem.objects.filter(group__code=SystemCatalogs.BANK).first())


# ── 1. Crucero, paquetes y seguro ─────────────────────────────────────────
def productos():
    from reservas.models import CruiseLine

    naviera = CruiseLine.objects.order_by("pk").first()
    c1 = cliente("Marisol", "Pimentel Grullón", "03100200041", "8295550161")
    r = guardar("cruise", c1, {
        "cruise_line_name": naviera.name if naviera else "Naviera del Caribe",
        "ship_name": "", "itinerary_name": "Caribe Sur desde La Romana · 7 noches",
        "status": "confirmed", "cabin_category": "balcony", "region": "Caribe",
        "base_fare_total": "62000", "taxes_total": "9800", "gratuities_total": "4200", "fees_total": "0",
        "provider_cost_total": "68400", "sale_total": "76000", "commission_total": "7600",
    }, {
        "stops": [
            {"stop_type": "embarkation", "port_name": "La Romana", "departure_datetime": momento(38, 17), "country": "República Dominicana"},
            {"stop_type": "port_of_call", "port_name": "Willemstad", "arrival_datetime": momento(40, 8), "departure_datetime": momento(40, 17), "country": "Curazao"},
            {"stop_type": "port_of_call", "port_name": "Oranjestad", "arrival_datetime": momento(41, 8), "departure_datetime": momento(41, 18), "country": "Aruba"},
            {"stop_type": "disembarkation", "port_name": "La Romana", "arrival_datetime": momento(45, 7), "country": "República Dominicana"},
        ],
        "passengers": [viajero(c1), acompanante(c1, "Ernesto")],
    })
    if r:
        abonar(r, D("0.40"), metodo="transfer", banco=banco_dop())

    c2 = cliente("Rafael", "Montás Peguero", "03100200042", "8295550162")
    r = guardar("package", c2, {
        "package_name": "Punta Cana todo incluido + traslados", "package_type": "beach",
        "status": "confirmed", "destination": "Punta Cana", "origin": "Santiago",
        "tour_operator_name": "Operador Costa Este", "taxes_total": "0", "fees_total": "0",
    }, {
        "components": [
            {"component_type": "hotel", "name": "Hotel 4 noches · todo incluido", "start_date": fecha(19), "end_date": fecha(23), "quantity": "2", "unit_price": "17600", "unit_cost": "15200", "location": "Punta Cana"},
            {"component_type": "transfer", "name": "Traslado Santiago – Punta Cana (ida y vuelta)", "start_date": fecha(19), "end_date": fecha(23), "quantity": "2", "unit_price": "3200", "unit_cost": "2500", "location": "Santiago"},
            {"component_type": "tour", "name": "Tour en catamarán", "start_date": fecha(21), "end_date": fecha(21), "quantity": "2", "unit_price": "3900", "unit_cost": "3000", "location": "Bávaro"},
        ],
        "travelers": [viajero(c2), acompanante(c2, "Claudia")],
    })
    if r:
        abonar(r, D("0.50"))

    c3 = cliente("Verónica", "Sosa Lantigua", "03100200043", "8295550163")
    r = guardar("package", c3, {
        "package_name": "Medellín cultural · 5 días", "package_type": "cultural",
        "status": "reserved", "destination": "Medellín", "origin": "Santo Domingo",
        "tour_operator_name": "Andes Receptivo", "taxes_total": "0", "fees_total": "0",
    }, {
        "components": [
            {"component_type": "flight", "name": "Vuelo SDQ – MDE ida y vuelta", "start_date": fecha(52), "end_date": fecha(57), "quantity": "1", "unit_price": "29500", "unit_cost": "26800", "location": "Santo Domingo"},
            {"component_type": "hotel", "name": "Hotel boutique en El Poblado · 5 noches", "start_date": fecha(52), "end_date": fecha(57), "quantity": "1", "unit_price": "24500", "unit_cost": "21000", "location": "Medellín"},
            {"component_type": "tour", "name": "Tour Comuna 13 y Guatapé", "start_date": fecha(54), "end_date": fecha(55), "quantity": "1", "unit_price": "6800", "unit_cost": "5400", "location": "Medellín"},
        ],
        "travelers": [viajero(c3)],
    })
    if r:
        abonar(r, D("0.30"), aplicar=False)

    c4 = cliente("Alberto", "Rijo Castaños", "03100200044", "8295550164")
    r = guardar("insurance", c4, {
        "insurer_name": "Seguros Ruta Segura", "plan_name": "Plan Global Plus", "policy_number": "RS-2026-004871",
        "coverage_type": "comprehensive", "status": "issued", "destination": "Europa",
        "coverage_amount": "50000", "includes_medical": True, "includes_cancellation": True,
        "coverage_start": fecha(29), "coverage_end": fecha(44),
        "base_premium": "6800", "taxes_total": "0", "fees_total": "0",
        "provider_cost_total": "5440", "sale_total": "6800", "commission_total": "1360",
    }, {"insured": [
        {**viajero(c4), "document_type": "passport", "document_number": "RD0044101"},
        {**acompanante(c4, "Mercedes"), "document_type": "passport", "document_number": "RD0044102"},
    ]})
    if r:
        abonar(r, None, metodo="card", banco=banco_dop())


# ── 2. Localizadores: el motor de estados las confirma ────────────────────
def localizadores():
    n = 0
    from django.db.models import Q

    for r in Reserva.objects.filter(Q(provider_locator="") | Q(provider_locator__isnull=True)).order_by("pk"):
        if r.pk % 3 == 0 or r.stay_status == "finalizada" or r.pk in (1, 2, 5):
            r.provider_locator = f"CNF-{240000 + r.pk * 137}"
            r.save()
            n += 1
    print(f"· Localizadores cargados: {n}")


# ── 3. Cobros por transferencia con banco ─────────────────────────────────
def transferencias():
    banco = banco_dop()
    hechas = 0
    if Pago.objects.filter(referencia__startswith="PF-", metodo_pago="transfer").count() >= 5:
        return  # ya sembradas
    for r in Reserva.objects.order_by("pk"):
        if hechas >= 4:
            break
        if Pago.objects.filter(reserva=r, referencia__startswith="PF-").exists():
            continue
        r.refresh_from_db()
        pagado = sum((p.monto for p in Pago.objects.valid().filter(reserva=r)), D("0"))
        if D("0") < pagado < r.total:
            abonar(r, D("0.20"), metodo="transfer", banco=banco)
            hechas += 1
    print(f"· Cobros por transferencia: {hechas}")


def transferencias_aplicadas():
    """Tres transferencias CON comprobante, verificadas y aplicadas por contabilidad."""
    banco = banco_dop()
    if Pago.objects.filter(referencia__startswith="PF-", metodo_pago="transfer", bank_transaction__isnull=False).count() >= 3:
        return
    hechas = 0
    for r in Reserva.objects.order_by("-pk"):
        if hechas >= 3:
            break
        if Pago.objects.filter(reserva=r, referencia__startswith="PF-").exists():
            continue
        pagado = sum((p.monto for p in Pago.objects.valid().filter(reserva=r)), D("0"))
        if D("0") < pagado < r.total:
            abonar(r, D("0.15"), metodo="transfer", banco=banco)
            hechas += 1
    print(f"· Transferencias aplicadas: {hechas}")


# ── 4. Pagos a suplidor por la vista real ─────────────────────────────────
def pagos_suplidor():
    from contabilidad.models import AccountsPayable

    client = Client(SERVER_NAME="localhost")
    client.force_login(CONTABLE)
    url = reverse("contabilidad:supplier_payment_create")
    banco = banco_dop()
    hechos = 0
    for cxp in AccountsPayable.objects.filter(reserva__invoice__isnull=False).order_by("pk"):
        if hechos >= 4:
            break
        resp = client.get(url, {"payable_id": cxp.pk})
        form = resp.context["form"] if resp.context else None
        if form is None:
            errores.append(f"CxP {cxp.pk}: GET {resp.status_code}")
            continue
        data = {}
        for nombre, campo in form.fields.items():
            valor = form[nombre].value()
            if valor not in (None, "") and not isinstance(valor, list):
                data[nombre] = valor.pk if hasattr(valor, "pk") else valor
        saldo = cxp.outstanding() if callable(cxp.outstanding) else cxp.outstanding
        if saldo <= 0:
            continue
        metodo = next((c for c, label in form.fields["method"].choices if "ransfer" in str(label)), None)
        data.update(
            payable=cxp.pk, method=getattr(metodo, "value", metodo), amount=str(saldo),
            date=HOY.isoformat(), reference=f"PF-SUP-{cxp.pk}", comments="Pago al suplidor tras el viaje",
            bank=banco.pk if banco else "", bank_transaction_code=f"PSUP{uuid4().hex[:8].upper()}",
            bank_description="Pago a suplidor",
        )
        if "disbursement_currency" in form.fields:
            data.setdefault("disbursement_currency", DOP.pk)
            data["disbursement_amount"] = str(saldo)
        resp = client.post(url + f"?payable_id={cxp.pk}", data)
        if resp.status_code in (301, 302):
            hechos += 1
        else:
            errs = resp.context["form"].errors if resp.context and "form" in resp.context else resp.status_code
            errores.append(f"pago suplidor CxP {cxp.pk}: {errs}")
    print(f"· Pagos a suplidor: {hechos}")


# ── 5. Empresas en el CRM ─────────────────────────────────────────────────
def empresas():
    datos = [
        ("Grupo Horizonte Caribe", "Grupo Horizonte Caribe SRL", "Laura Ceballos", "Gerente de Compras"),
        ("Congresos del Cibao", "Congresos del Cibao SAS", "Pedro Almánzar", "Director"),
        ("Colegio Nuevo Amanecer", "Colegio Nuevo Amanecer SRL", "Ana Belén Soriano", "Coordinadora de Viajes"),
    ]
    for i, (comercial, razon, rep, cargo) in enumerate(datos, start=1):
        if Empresa.all_objects.filter(nombre_comercial=comercial).exists() if hasattr(Empresa, "all_objects") else Empresa.objects.filter(nombre_comercial=comercial).exists():
            continue
        try:
            Empresa.objects.create(
                nombre_comercial=comercial, razon_social=razon, rnc=f"00000000{i}",
                direccion_fisica="Santo Domingo, República Dominicana",
                direccion_electronica=f"viajes@empresa{i}.example.com", telefono=f"+1809555017{i}",
                representante=rep, cargo_representante=cargo,
            )
            print(f"· Empresa {comercial}")
        except Exception as exc:  # noqa: BLE001
            errores.append(f"empresa {comercial}: {exc}")


# ── 6. Una anulación liquidada ────────────────────────────────────────────
def anulacion():
    from reservas.services.cancellation import liquidar_cancelacion

    candidata = (Reserva.objects.filter(cliente__cedula_pasaporte="00100100025").first())  # sin abonos
    if candidata is None or getattr(candidata, "cancellation_settlements", None) and candidata.cancellation_settlements.exists():
        return
    try:
        liquidar_cancelacion(candidata, actor=ADMIN, reason_code="client_request",
                             reason="El cliente pospuso el viaje por motivos de trabajo.")
        print(f"· Reserva {candidata.pk} anulada")
    except Exception as exc:  # noqa: BLE001
        errores.append(f"anulación {candidata.pk}: {exc}")


if __name__ == "__main__":
    # Los pagos a suplidor van en la fase 3, aplicados a su documento fiscal.
    for paso in (productos, localizadores, transferencias, transferencias_aplicadas, empresas, anulacion):
        paso()
    print(f"Errores: {len(errores)}")
    for e in errores:
        print("  ✗", e)
