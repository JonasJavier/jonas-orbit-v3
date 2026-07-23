<!-- portfolio-content/omsta/case-study-summary.md -->

# Resumen para la tarjeta del portafolio — OMSTA

> Versión condensada para la tarjeta de Endurance y metadatos. Basado en evidencia
> verificable; sin métricas de negocio inventadas.

## Ficha

- **Título:** OMSTA — ERP para una agencia de viajes en producción
- **Descripción corta:** Sistema Django que conecta reservas, cobros y contabilidad
  de doble partida con cumplimiento fiscal dominicano, multimoneda y multisucursal.
- **Problema (una frase):** Una agencia de viajes necesitaba unir venta, dinero y
  contabilidad formal, que vivían en herramientas separadas y sin trazabilidad.
- **Solución (una frase):** Un ERP modular en Django donde cada reserva fluye
  automáticamente a cobro, asiento contable y reporte fiscal, con auditoría y
  permisos por rol y sucursal.
- **Mi función:** Desarrollo full-stack, arquitectura, contabilidad y mantenimiento
  en producción. <!-- [CONFIRMAR] alcance exacto de la autoría -->
- **Stack principal:** Django · Django REST Framework · PostgreSQL · Redis ·
  Django Q2 · Railway.
- **Tres capacidades demostradas:**
  1. Contabilidad de doble partida real (asientos balanceados + posteo por documento).
  2. Flujos de dinero atómicos e idempotentes (pagos, excedentes, reembolsos, notas).
  3. Cumplimiento fiscal dominicano (DGII 606/607/608/623) y multimoneda.
- **Estado:** En producción.
- **CTA:** «Ver caso completo» / «¿Necesitas un sistema así? Trabajemos juntos».

## Recursos visuales

- **Imagen principal:** `screenshots/sanitized/01-dashboard-panel-ejecutivo.png`
- **Alt de la imagen principal:** «Panel ejecutivo de OMSTA con tarjetas de KPIs de
  reservas, cobros y cuentas por cobrar, y alertas operativas.»

## SEO / social

- **Meta título (≤60):** OMSTA — ERP de agencia de viajes en Django | Caso de estudio
- **Meta descripción (≤155):** Caso de estudio de OMSTA: un ERP en producción hecho
  en Django que integra reservas, cobros, contabilidad de doble partida y
  cumplimiento fiscal dominicano.
- **Open Graph (descripción):** OMSTA es un ERP real, en producción, para una
  agencia de viajes: reservas multi-producto, cobros, contabilidad de doble partida,
  DGII, multimoneda y multisucursal, construido y mantenido en Django.
- **Keywords sugeridas:** Django, ERP, agencia de viajes, contabilidad doble partida,
  DGII, PostgreSQL, Redis, Django Q2, multimoneda, Railway, full-stack.

## Versión de 50 palabras

OMSTA es un ERP en producción para una agencia de viajes dominicana, hecho en
Django. Conecta reservas de hotel, vuelo y crucero con cobros, contabilidad de
doble partida y cumplimiento fiscal DGII, en varias monedas y sucursales. Desarrollé
su arquitectura, su capa de servicios financieros y su mantenimiento en producción.

## Versión de 100 palabras

OMSTA es un ERP real, en producción, para una agencia de viajes en República
Dominicana, construido en Django, DRF, PostgreSQL, Redis y Django Q2, desplegado en
Railway. Integra en una sola plataforma la venta (reservas de hotel, vuelo, crucero,
paquete y seguro), el dinero (cobros, pagos a mayoristas, comisiones, saldos) y la
contabilidad formal (asientos de doble partida, cuentas por cobrar y pagar,
reportes fiscales DGII), con multimoneda, multisucursal, permisos por rol y
auditoría. Me encargué del backend, la arquitectura, la contabilidad y el
mantenimiento, incluida la corrección de incidentes reales y el pago de deuda
técnica con pruebas.

## Versión de 200 palabras

OMSTA es el sistema de gestión de una agencia de viajes que opera en República
Dominicana. Está en producción, desplegado en Railway, y se usa para el trabajo
diario de vender viajes, cobrar, pagar a proveedores y llevar la contabilidad
formal del negocio.

El reto no era hacer un CRUD de reservas, sino lograr que cada operación comercial
tuviera automáticamente su consecuencia financiera y contable correcta: que una
reserva se convierta en cobro, el cobro en asiento de doble partida y el asiento en
reporte fiscal DGII, en varias monedas y con controles de acceso por rol y sucursal.

Es un monolito Django modular (18 aplicaciones) con una capa de servicios seria para
los flujos de dinero: pagos idempotentes, posteo contable por documento y un libro
mayor neutral. Me encargué del modelado de dominio, el backend en Django/DRF, la
contabilidad, el despliegue y el mantenimiento en producción.

Un ejemplo de ese mantenimiento: cuando un descuento aplicado a una reserva ya
pagada dejó un crédito a favor del cliente, el sistema lo contabilizó bien pero no
lo comunicaba; lo corregí en el aviso al guardar, en el recibo y con una herramienta
de diagnóstico. En software de dinero, comunicar el resultado importa tanto como
calcularlo.
