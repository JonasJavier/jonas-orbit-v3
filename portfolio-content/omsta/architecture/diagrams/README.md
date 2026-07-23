<!-- portfolio-content/omsta/architecture/diagrams/README.md -->

# Diagramas de arquitectura — OMSTA

Los diagramas viven como **Mermaid embebido** en los documentos de arquitectura
(se renderizan directamente en GitHub, VS Code y la mayoría de visores Markdown).
Aquí se guardan además las **fuentes `.mmd`** para poder exportarlas a SVG/PNG.

| Archivo | Diagrama | Documento fuente |
|---|---|---|
| `01-context.mmd` | Contexto (C4 nivel 1) | `../system-overview.md` |
| `02-containers.mmd` | Contenedores (C4 nivel 2) | `../system-overview.md` |
| `03-flujo-cobro-posteo.mmd` | Flujo cobro → asiento → CxC | `../data-flow.md` |
| `04-deployment.mmd` | Despliegue en Railway | `../deployment.md` |

El mapa de dependencias entre dominios y los demás flujos (crédito a favor,
acceso por rol, export asíncrono) están embebidos en `../module-map.md` y
`../data-flow.md`.

## Exportar a SVG/PNG (opcional)

Requiere Node. Desde esta carpeta:

```bash
npx -y @mermaid-js/mermaid-cli -i 01-context.mmd -o 01-context.svg
npx -y @mermaid-js/mermaid-cli -i 02-containers.mmd -o 02-containers.svg
npx -y @mermaid-js/mermaid-cli -i 03-flujo-cobro-posteo.mmd -o 03-flujo-cobro-posteo.svg
npx -y @mermaid-js/mermaid-cli -i 04-deployment.mmd -o 04-deployment.svg
```

> Nota: la exportación a SVG/PNG quedó como paso opcional. No se ejecutó en la
> generación de este paquete para no depender de descargas de red; las fuentes
> `.mmd` y el Mermaid embebido son suficientes para renderizar y editar.
> Todo elemento de cada diagrama se deriva del código o la configuración reales
> (`settings.py`, `urls.py`, servicios de dominio, `railpack.json`).
