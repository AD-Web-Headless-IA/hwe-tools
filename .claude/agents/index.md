# Agentes — índice

> Resumen rápido de los 11 agentes de esta carpeta: **qué hace** cada uno y **dónde se usa**. Para el detalle completo (contratos, ficheros que toca, casos de rechazo), abre el `.md` del agente o la referencia larga en [`docs/specs/ai/agent-directory.md`](../../docs/specs/ai/agent-directory.md).

---

## Pipeline SPECBOOT (en orden)

Los 4 agentes que se ejecutan **uno tras otro** en cada user story. La salida de uno es la entrada del siguiente.

Flujo: `/enrich-us` → **planner** → **implementer** → **reviewer** → **verifier** → **docs-writer** (`/archive`) → `/commit`.

| Agente | Qué hace | Modelo | Dónde se usa |
|---|---|---|---|
| [`planner`](planner.md) | Diseña la solución: qué ficheros tocar, patrones a seguir, schemas y plan de tests. **No escribe código.** | Opus | `/propose` |
| [`implementer`](implementer.md) | Implementa el proposal **TDD-first** (test → falla → código → pasa). Sigue el plan al pie de la letra. | Sonnet | `/apply` |
| [`reviewer`](reviewer.md) | Revisión independiente del diff (solo ve diff + story, nunca el proposal). Da issues por severidad o aprueba. | Opus | `/review` |
| [`verifier`](verifier.md) | Gates mecánicos de CI: typecheck → test → lint → build. Verde/rojo binario, sin diagnóstico. | Haiku | `/verify` |
| [`docs-writer`](docs-writer.md) | Cierra la story: sincroniza specs con lo construido, actualiza catálogo y README. También crea guías y stories. | Sonnet | `/archive` |

---

## Especialistas (consultores, solo lectura)

Auditan e informan. **Nunca escriben código de aplicación ni hacen commits.** Se invocan cuando hacen falta.

| Agente | Qué hace | Modelo | Dónde se usa |
|---|---|---|---|
| [`architect`](architect.md) | Guardián de la plataforma: DECs, contratos, modelo de dominio, límites entre paquetes. Propone DECs. | Opus | Antes de cualquier cambio estructural; cuando hace falta un DEC nuevo |
| [`senior-developer`](senior-developer.md) | Experto del core (`@hwe/core-ui` / `@hwe/config`). Guía sobre patrones e idioms al implementar. | Sonnet | Durante `/apply` y `/scaffold-block`; trabajo de bloques complejo |
| [`ux-ui-analyst`](ux-ui-analyst.md) | Fidelidad visual. **Modo A:** valida un bloque contra su Figma. **Modo B:** crea la spec visual si no hay Figma. | Sonnet | `/design-block`; tras implementar un bloque o extraer tokens |
| [`seo-geo-specialist`](seo-geo-specialist.md) | Visibilidad en buscadores: HTML semántico, jerarquía de headings, datos estructurados, meta tags, SEO local. | Sonnet | `/seo-audit`; tras cada bloque; setup de site; pre-deploy |
| [`security-specialist`](security-specialist.md) | Protección de datos: RGPD, validación de inputs, headers/CSP, cookies, secretos, dependencias. | Sonnet | `/security-audit`; tras bloques con input de usuario; pre-deploy |
| [`qa-engineer`](qa-engineer.md) | Calidad más allá del CI: comportamiento real, responsive, accesibilidad y la integración entre bloques. | Sonnet | Tras montar composiciones; cambios grandes de bloques; pre-deploy |

---

## En pocas palabras

En WordPress lo harías todo tú. Aquí **convocas a un especialista según la tarea**: los 4 del pipeline SPECBOOT corren en orden para cada story (planear → implementar → revisar → verificar, y `docs-writer` la cierra); los especialistas son consultores que llamas cuando los necesitas (visual, SEO, seguridad, QA, arquitectura). Los agentes no se llaman entre sí — el orquestador decide el orden.
