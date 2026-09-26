# portfolio-content/omsta-2026/scripts/seed_portfolio.py
"""Siembra datos SINTÉTICOS en la BD local aislada ``omsta_portfolio``.

Reutiliza las piezas de ``core/management/commands/seed_demo.py`` (catálogos,
empresa, sucursales, usuarios, hoteles) y los MISMOS servicios que la web y la
app usan para dar de alta reservas y registrar/aplicar cobros
(``movil.services.alta_reserva.guardar``, ``movil.services.pagos.registrar``,
``contabilidad.services.payment_review.apply_customer_payment``), así que CxC,
CxP y asientos se generan como en la operación real.

Diferencias con ``seed_demo``:
- la operación va en DOP (la BD de desarrollo tiene 49 reservas en DOP y 5 en
  USD); el listado de reservas suma importes sin convertir, ver excluded.md;
- más clientes, asesores en dos sucursales, viajes pasados y futuros;
- nombres de usuarios y empleados creíbles pero ficticios.

No toca el repo OMSTA ni ninguna otra BD: aborta si la BD no es omsta_portfolio.
Uso, desde la raíz del repo OMSTA con portfolio-env.ps1 -Seed cargado y las
variables DEMO_USERS_PASSWORD / DEMO_TESTER_PASSWORDS definidas:

    python <ruta>/seed_portfolio.py
"""
from __future__ import annotations

import os
import sys
from contextlib import nullcontext
from dataclasses import replace
from datetime import timedelta
from decimal import Decimal
from unittest import mock

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
import django  # noqa: E402

django.setup()

from django.conf import settings  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.utils import timezone  # noqa: E402

assert settings.DATABASES["default"]["NAME"] == "omsta_portfolio", "BD equivocada: abortar"
assert settings.DATABASES["default"]["HOST"] in ("127.0.0.1", "localhost"), "host no local"
assert settings.DEMO_MODE, "Cargar portfolio-env.ps1 -Seed"

from core.management.commands import seed_demo as sd  # noqa: E402
from core.management.commands.seed_demo import Escenario  # noqa: E402

D = Decimal

# Dos hoteles más para que el catálogo no se vea corto.
sd.HOTELES = sd.HOTELES + (
    {
        "nombre": "Bahía Dorada Boutique Hotel",
        "ubicacion": "Puerto Plata, Puerto Plata",
        "comision": D("12.00"),
        "categorias": (("Doble Superior", D("7800")), ("Suite Vista Bahía", D("11900"))),
    },
    {
        "nombre": "Montaña Verde Eco Lodge",
        "ubicacion": "Jarabacoa, La Vega",
        "comision": D("10.00"),
        "categorias": (("Cabaña Estándar", D("6200")), ("Cabaña Familiar", D("9400"))),
    },
)

# Tarifas en DOP para las categorías de los tres hoteles de seed_demo.
TARIFAS_DOP = {
    0: (D("7200"), D("10500")),
    1: (D("5700"), D("9000")),
    2: (D("6600"), D("9600")),
}

# (cliente, tipo, días desde hoy, noches, hotel, categoría, abonos, aplicar, extra, asesor)
C = [
    ("Mariel", "Santana Rosario", "00100100011", "8095550131"),
    ("Julio", "Espinal Marte", "00100100012", "8095550132"),
    ("Daniela", "Cruz Ventura", "00100100013", "8095550133"),
    ("Héctor", "Paulino Reyes", "00100100014", "8095550134"),
    ("Yanira", "Beltré Soto", "00100100015", "8095550135"),
    ("Ramón", "Taveras Luna", "00100100016", "8095550136"),
    ("Gabriela", "Núñez Polanco", "00100100017", "8095550137"),
    ("Fernando", "Acosta Cabral", "00100100018", "8095550138"),
    ("Paola", "Jiménez Ureña", "00100100019", "8095550139"),
    ("Miguel", "Rosario Frías", "00100100020", "8095550140"),
    ("Esther", "Valdez Mota", "00100100021", "8095550141"),
    ("Andrés", "Holguín Batista", "00100100022", "8095550142"),
    ("Lucía", "Estévez Durán", "00100100023", "8095550143"),
    ("Samuel", "Pichardo Gil", "00100100024", "8095550144"),
    ("Natalia", "Brito Ogando", "00100100025", "8095550145"),
    ("Óscar", "Lora Sánchez", "00100100026", "8095550146"),
    ("Patricia", "Veras Almánzar", "00100100027", "8095550147"),
    ("Tomás", "Guerrero Peña", "00100100028", "8095550148"),
    ("Carolina", "Matos Féliz", "00100100029", "8095550149"),
    ("Iván", "Marte Castillo", "00100100030", "8095550150"),
    ("Rebeca", "Suero Tejada", "00100100031", "8095550151"),
    ("Wilson", "Ortiz Rondón", "00100100032", "8095550152"),
]


def E(i, tipo, dias, **kw):
    return (Escenario(C[i], tipo, dias, **{k: v for k, v in kw.items() if k != "asesor"}), kw.get("asesor", "reservas"))


ESCENARIOS = [
    # Viajes ya realizados (para facturar y para el historial).
    E(0, "hotel", -40, noches=3, hotel=0, categoria=1, abonos=(None,)),
    E(1, "hotel", -28, noches=4, hotel=1, abonos=(D("0.50"), None), asesor="ventas.sti"),
    E(2, "flight", -21, abonos=(None,), extra={"destino": ("PUJ", "Punta Cana"), "precio": "9800"}),
    E(3, "hotel", -14, noches=2, hotel=2, abonos=(None,)),
    E(4, "otros", -10, abonos=(None,), extra={"servicio": "Excursión Isla Saona", "precio": ("4500", "3600", "2")}, asesor="ventas.sti"),
    # Próximos, en distintos momentos del cobro.
    E(5, "hotel", 3, noches=3, hotel=3, abonos=(None,)),
    E(6, "hotel", 6, noches=4, hotel=0, abonos=(D("0.60"),), asesor="ventas.sti"),
    E(7, "flight", 9, abonos=(D("0.50"),), extra={"destino": ("MIA", "Miami"), "precio": "24500"}),
    E(8, "hotel", 12, noches=5, hotel=4, categoria=1, abonos=(D("0.30"),), aplicar=False),
    E(9, "hotel", 15, noches=3, hotel=1, categoria=1),
    E(10, "otros", 18, abonos=(None,), extra={"servicio": "Traslado aeropuerto – hotel", "precio": ("2500", "1900", "2")}),
    E(11, "flight", 22, abonos=(D("0.40"),), aplicar=False, extra={"destino": ("MAD", "Madrid"), "precio": "58900"}, asesor="ventas.sti"),
    E(12, "hotel", 26, noches=7, hotel=0, categoria=1, abonos=(D("0.25"), D("0.25"))),
    E(13, "hotel", 31, noches=2, hotel=2, categoria=1, abonos=(D("0.50"),)),
    E(14, "flight", 35, extra={"destino": ("JFK", "Nueva York"), "precio": "31200"}),
    E(15, "hotel", 41, noches=4, hotel=3, categoria=1, abonos=(D("0.20"),), asesor="ventas.sti"),
    E(16, "otros", 47, abonos=(D("0.50"),), extra={"servicio": "Tour Cayo Arena y Montecristi", "precio": ("5200", "4100", "3")}),
    E(17, "hotel", 55, noches=3, hotel=4, abonos=(None,)),
    E(18, "hotel", 63, noches=5, hotel=1, abonos=(D("0.35"),), aplicar=False, asesor="ventas.sti"),
    E(19, "flight", 70, abonos=(D("0.30"),), extra={"destino": ("BOG", "Bogotá"), "precio": "27800"}),
    E(20, "hotel", 84, noches=6, hotel=0, categoria=1),
    E(21, "otros", 95, extra={"servicio": "Seguro de viaje familiar", "precio": ("3800", "3000", "4")}, asesor="ventas.sti"),
]

NOMBRES_USUARIOS = {
    "demo.admin": ("Adriana", "Mejía"),
    "demo.contabilidad": ("Carlos", "Peralta"),
    "demo.reservas": ("Rosa", "Jiménez"),
    "demo.clientes": ("César", "Tavárez"),
}

EMPLEADOS = [
    ("Laura", "Guzmán Pérez"), ("Manuel", "Del Rosario"), ("Sandra", "Frías Mota"),
    ("Joel", "Peguero Díaz"), ("Karina", "Almonte Ruiz"), ("Rubén", "Castillo Vargas"),
    ("Mónica", "Tejeda Luna"), ("Alexis", "Fermín Soto"), ("Diana", "Quezada Rivas"),
    ("Pablo", "Encarnación Gil"),
]


ANTICIPO = 25  # días entre el alta y la entrada de un viaje ya realizado
_NOW = timezone.now  # reloj real, capturado antes de cualquier desplazamiento


def _facturar_realizadas(contable) -> list:
    """Emite la factura (NCF B02, consumo) de cada viaje ya finalizado.

    Pasa por la vista real de alta de factura con el cliente de pruebas de
    Django, como lo haría contabilidad desde la web: asigna el NCF y publica el
    paquete contable en una sola transacción.
    """
    from django.test import Client
    from django.urls import reverse

    from contabilidad.models import NCFSequence
    from reservas.models import Reserva

    client = Client(SERVER_NAME="localhost")
    client.force_login(contable)
    secuencia = NCFSequence.objects.filter(
        fiscal_use=NCFSequence.FiscalUse.CONSUMO,
        document_type=NCFSequence.DocumentType.INVOICE,
    ).first()
    errores = []
    for reserva in Reserva.objects.filter(invoice__isnull=True).order_by("pk"):
        if reserva.stay_status != "finalizada":
            continue
        datos = {"ncf": "", "invoice_date": timezone.localdate().isoformat(), "discount": ""}
        if secuencia:
            datos["ncf_sequence"] = str(secuencia.pk)
        resp = client.post(reverse("contabilidad:invoice_create", args=[reserva.pk]), datos)
        reserva.refresh_from_db()
        if getattr(reserva, "invoice", None) is None:
            errores.append(f"factura reserva {reserva.pk}: HTTP {resp.status_code}")
        else:
            print(f"· Factura {reserva.invoice.ncf} para la reserva {reserva.pk}")
    return errores


class Cmd(sd.Command):
    """seed_demo con «otros servicios» a precios en DOP (el original usa 150 fijo)."""

    @staticmethod
    def _entrada_otros(escenario, cliente, moneda, inicio) -> dict:
        precio, costo, cantidad = escenario.extra.get("precio", ("4500", "3600", "2"))
        entrada = sd.Command._entrada_otros(escenario, cliente, moneda, inicio)
        comision = (D(precio) - D(costo)) * D(cantidad)
        entrada["valores"]["commission_total"] = str(comision)
        entrada["filas"]["items"][0].update(quantity=cantidad, unit_price=precio, unit_cost=costo)
        return entrada


def main():
    from django.contrib.auth import get_user_model
    from crm.models import Cliente
    from divisas.models import Currency
    from reservas.models import Reserva
    from sucursales.models import Sucursal

    User = get_user_model()
    cmd = Cmd()
    for semilla, opciones in sd.CATALOG_SEEDS:
        print("·", semilla)
        call_command(semilla, **opciones)

    cmd._empresa()
    principal = cmd._sucursales()
    santiago = Sucursal.objects.get(codigo="DEMO-STI")
    password = os.environ["DEMO_USERS_PASSWORD"]
    usuarios = cmd._usuarios([(u, password) for u in sd.USUARIOS], principal, False)
    extra = cmd._usuarios([(("ventas.sti", "reservas", "Luis", "Ventura"), password)], santiago, False)
    asesores = {"reservas": usuarios["reservas"], "ventas.sti": extra["reservas"]}
    for username, (nombre, apellido) in NOMBRES_USUARIOS.items():
        User.objects.filter(username=username).update(first_name=nombre, last_name=apellido)

    hoteles = cmd._hoteles()
    # Tarifas DOP en lugar de las USD de seed_demo (las 2 nuevas ya van en DOP).
    for idx, tarifas in TARIFAS_DOP.items():
        hotel, ocupacion, categorias = hoteles[idx]
        hoteles[idx] = (hotel, ocupacion, [(c, t) for (c, _), t in zip(categorias, tarifas, strict=True)])

    dop = Currency.objects.get(code="DOP")
    contable = usuarios["contabilidad"]
    hoy = timezone.localdate()
    creadas, fallidas = 0, []
    for escenario, asesor_key in ESCENARIOS:
        nombre, apellido, cedula, telefono = escenario.cliente
        email = f"{nombre}.{apellido.split()[0]}@example.com".lower()
        for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
            email = email.replace(a, b)
        cliente, _ = Cliente.objects.get_or_create(
            cedula_pasaporte=cedula,
            defaults={"nombre": nombre, "apellido": apellido, "email": email,
                      "telefono": f"+1{telefono}", "direccion_fisica": "Santo Domingo, República Dominicana"},
        )
        if Reserva.objects.filter(cliente=cliente).exists():
            continue
        asesor = asesores[asesor_key]
        # Un viaje ya realizado no se puede dar de alta hoy (la regla exige
        # entrada hoy o futura). Se da de alta «en su día»: el reloj de Django se
        # desplaza ANTICIPO días antes de la entrada solo mientras corren los
        # servicios reales de alta y cobro.
        if escenario.dias < 0:
            desplazo = timedelta(days=ANTICIPO - escenario.dias)
            escenario_alta = replace(escenario, dias=ANTICIPO)
            reloj = mock.patch("django.utils.timezone.now", lambda d=desplazo: _NOW() - d)
        else:
            escenario_alta, reloj = escenario, nullcontext()
        with reloj:
            entrada = cmd._entrada(escenario_alta, cliente, dop, hoteles)
            try:
                resultado = cmd._guardar(escenario.tipo, entrada, asesor)
            except Exception as exc:  # noqa: BLE001 - se informa y se sigue
                fallidas.append(f"{cliente} ({escenario.tipo}, {escenario.dias}d): {exc}")
                continue
            reserva = Reserva.objects.get(pk=resultado["reserva_id"])
            try:
                cmd._abonar(reserva, escenario, asesor, contable)
            except Exception as exc:  # noqa: BLE001
                fallidas.append(f"abono reserva {reserva.pk}: {exc}")
        creadas += 1
        print(f"· Reserva {reserva.pk} ({escenario.tipo}, {escenario.dias:+d}d) {cliente}")

    fallidas += _facturar_realizadas(contable)

    # Empleados de nómina con nombres creíbles.
    call_command("seed_nomina_demo", employees=len(EMPLEADOS))
    for i, (nombre, apellido) in enumerate(EMPLEADOS, start=1):
        User.objects.filter(username=f"nomina_demo_{i:02d}").update(first_name=nombre, last_name=apellido)

    print(f"Reservas nuevas: {creadas}. Fallidas: {len(fallidas)}")
    for f in fallidas:
        print("  ✗", f)


if __name__ == "__main__":
    main()
