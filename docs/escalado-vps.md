# Plan de escalado — VPS Apuntado (`apuntado-vps`)

Documento de referencia para saber **cuándo** la infra actual se queda corta y **qué hacer** en cada fase.  
Arquitectura hoy (marzo 2026): **1 máquina Fly** (1 GB RAM, 1 CPU shared), Baileys, buffer 20 s, una `ANTHROPIC_API_KEY`, dashboard en Vercel, DB en Neon.

---

## 1. Límites actuales (baseline)

| Recurso | Valor hoy | Notas |
|---------|-----------|--------|
| App Fly | `apuntado-vps` | Región `dfw` |
| RAM | 1 GB | `fly.toml` → `memory = "1gb"` |
| CPU | 1 shared | Sin cola de IA |
| Réplicas | 1 | Comentario en repo: WhatsApp no replica horizontal con misma sesión |
| Sesiones WA | `/data/auth_sessions/{businessId}` | Volumen Fly `auth_sessions` |
| Debounce bot | 20 s (`MESSAGE_DEBOUNCE_MS`) | 1 llamada Haiku por ráfaga de mensajes |
| Historial IA | 4 mensajes | `max_tokens: 512` |
| Plan trial | 100 chats / 100 respuestas IA/mes | Producto |
| Plan Básico | 200 chats + 1 200 respuestas IA/mes | Producto; Pro = ilimitado |

**Zona cómoda estimada:** 1–10 negocios pequeños conectados, picos &lt; 10 llamadas Haiku/minuto.

---

## 2. Indicadores — cómo saber que se acerca el máximo

Revisar **semanalmente** (5–10 min) o cuando un cliente reporte lentitud.

### 2.1 Fly.io (infra)

| Indicador | Verde | Amarillo | Rojo (actuar) |
|-----------|-------|----------|----------------|
| RAM usada | &lt; 65 % | 65–80 % varios días | &gt; 80 % sostenido o OOM/restarts |
| CPU | Picos &lt; 70 % | 70–90 % en hora pico (18:00–21:00 HN) | &gt; 90 % sostenido &gt; 15 min |
| Reinicios máquina | 0 | 1 esporádico | 2+ por semana o tras deploy sin cambio |
| Health check `/health` | Siempre OK | Fallos &lt; 1 % | Caídas repetidas |
| Negocios con WA conectado | &lt; 15 | 15–30 | 30+ en **un solo** VPS |

**Dónde mirar:** [Fly monitoring — apuntado-vps](https://fly.io/apps/apuntado-vps/monitoring)  
**CLI útil:** `fly logs -a apuntado-vps` (buscar `OOM`, `killed`, `ENOMEM`)

### 2.2 Logs del VPS (aplicación)

| Patrón en logs | Significado | Umbral aproximado |
|----------------|-------------|-------------------|
| `[Bot] Error Anthropic` + `429` | Rate limit Anthropic | 5+ en un día |
| `[Bot] Límite plan Básico` | Producto, no infra | Normal si muchos Básico al tope |
| `[Buffer] Nuevo lote` masivo en &lt; 1 min | Muchos chats disparando IA a la vez | 15+ líneas en 60 s |
| Latencia percibida &gt; 60 s | Cola en Node + API | Reportes de 3+ negocios |
| `Connection closed` / `logged out` Baileys | Sesión WA inestable | Varios negocios mismo día |
| `Error obteniendo contexto del dashboard` | Vercel/Neon lento o caída | Correlacionar con status Vercel |

### 2.3 Anthropic (costo y capacidad)

| Indicador | Verde | Amarillo | Rojo |
|-----------|-------|----------|------|
| Llamadas API / día (todos los negocios) | &lt; 500 | 500–2000 | 2000+ sin subir tier |
| Costo Haiku / mes | &lt; USD 80 | USD 80–250 | &gt; USD 250 con pocos clientes |
| Errores 429 | 0 | 1–3/día | Frecuentes en pico |

**Regla rápida de pico:**  
`llamadas_IA_por_minuto ≈ negocios_activos_en_hora_pico × 2`  
Ejemplo: 12 negocios activos a las 19:00 → ~24 llamadas/min → **amarillo/rojo**.

### 2.4 Base de datos (Neon)

| Indicador | Cuándo preocuparse |
|-----------|-------------------|
| Panel Citas / Conversaciones &gt; 3 s | Plan Neon pequeño o queries sin índice |
| Conexiones agotadas | Muchos cron + dashboard + VPS a la vez |

El cuello de botella **casi nunca** es Neon primero; suele ser VPS + Haiku.

### 2.5 Negocio / producto (señales indirectas)

| Señal | Interpretación |
|-------|----------------|
| Muchos planes **Pro** con &gt; 300 chats/mes cada uno | Presión IA y RAM aunque sean pocos negocios |
| Varios Básico en **200/200** conversaciones | Bot bloquea clientes nuevos (esperado); no confundir con caída VPS |
| Quejas “el bot tarda en responder” en **hora pico** | Infra, no prompt |

---

## 3. Estadísticas de referencia por escala

Cifras orientativas para **negocio pequeño** (barbería/salon): 30–80 chats nuevos/mes, 4–12 llamadas Haiku por chat.

| Negocios conectados | Chats nuevos/mes (total plataforma) | Llamadas Haiku/mes (aprox.) | Costo Haiku/mes (aprox.) | Estado 1 GB |
|---------------------|-------------------------------------|-----------------------------|-------------------------|-------------|
| 8 | 240–640 | 1 200–5 000 | USD 15–80 | Verde |
| 15 | 450–1 200 | 2 500–10 000 | USD 40–150 | Amarillo |
| 25 | 750–2 000 | 4 000–18 000 | USD 80–280 | Amarillo / rojo |
| 40+ | 1 200+ | 8 000+ | USD 150+ | Rojo |

| Chats simultáneos en pico (escribiendo ~misma hora) | Llamadas Haiku en ~1 min (aprox.) | Acción |
|-----------------------------------------------------|-----------------------------------|--------|
| &lt; 10 | &lt; 10 | Nada |
| 10–20 | 10–20 | Vigilar RAM |
| 20–40 | 20–40 | Subir RAM/CPU o 2.º VPS |
| &gt; 40 | 40+ | 2.º VPS + cola IA o shard |

---

## 4. Escalera de respuesta (qué hacer y en qué orden)

### Fase 0 — Monitoreo mínimo (hacer ya, sin escalar)

- [ ] Revisar Fly RAM/CPU 1× por semana.
- [ ] Revisar factura Anthropic 1× por mes.
- [ ] Contar negocios con WhatsApp **conectado** en panel.
- [ ] (Opcional futuro) Endpoint `/health` enriquecido: sesiones activas, buffers en memoria.

**Esfuerzo:** minutos. **Costo:** USD 0.

---

### Fase 1 — Misma máquina, más recursos (primer escalón)

**Cuándo:** amarillo en RAM (65–80 %) o 15–25 negocios tranquilos.

| Acción | Cambio | Esfuerzo | Costo extra/mes (aprox.) |
|--------|--------|----------|-------------------------|
| A1 | Fly **2 GB** RAM | Editar `fly.toml` + `fly deploy` | +USD 3–6 |
| A2 | Fly **2 CPUs** shared | Mismo archivo | +USD 5–10 adicional |
| A3 | Bajar debounce solo si hay pruebas | `MESSAGE_DEBOUNCE_MS` (cuidado: más llamadas IA) | Variable |

**No requiere** cambios en dashboard ni DB.  
**Riesgo:** bajo.

---

### Fase 2 — Optimizar antes de dividir VPS

**Cuándo:** rojo en RAM pero aún &lt; 30 negocios, o factura Haiku alta.

| Acción | Objetivo |
|--------|----------|
| B1 | Acortar system prompt / playbooks si creció mucho |
| B2 | Límite de concurrencia Haiku (ej. máx. 5 paralelas + cola) |
| B3 | Reintentos con backoff en 429 |
| B4 | Revisar negocios Pro muy activos (outliers) |

**Esfuerzo dev:** medio (1–2 días). **Costo infra:** igual o menor en Haiku.

---

### Fase 3 — Segundo VPS (shard manual)

**Cuándo:** 25–40+ negocios, 429 frecuentes, o 2 GB insuficiente.

**Qué implica (no está implementado hoy):**

| Tarea | Descripción | Tiempo estimado |
|-------|-------------|-----------------|
| C1 | Campo `Business.vpsUrl` o `vpsShard` en Prisma | 1–2 h |
| C2 | Dashboard: QR, socket, envío mensajes → VPS del negocio | 2–4 h |
| C3 | Segunda app Fly `apuntado-vps-2` + volumen propio | 1 h ops |
| C4 | Crons (recordatorios): **solo un líder** o filtrar por `businessId` | 2–3 h |
| C5 | Asignar negocios 1–N en VPS-A, N+1 en VPS-B (admin/SQL) | Manual |
| C6 | Migrar sesión: copiar carpeta `auth_sessions/{id}` o re-escanear QR | Por negocio |

**Esfuerzo total MVP:** ~1 día hábil. **Riesgo:** medio (negocio mal asignado = sin WhatsApp).

**Regla de reparto sugerida:**

- VPS-A (`apuntado-vps`): negocios 1–20 o todos los actuales.
- VPS-B: negocios nuevos desde el 21 en adelante.

---

### Fase 4 — Escala “seria” (más adelante)

| Componente | Para qué |
|------------|----------|
| Router por `businessId` | Un solo dominio, tráfico al VPS correcto |
| Cola Redis/Bull | Limitar paralelismo Haiku y picos |
| Varias API keys Anthropic | Un key por VPS o por shard |
| Métricas (Grafana / Fly metrics + alertas) | RAM &gt; 85 % → email |

**Esfuerzo:** días a semana. Solo si la Fase 3 se queda corta.

---

## 5. Checklist “¿actuamos esta semana?”

Marcar **SÍ** si cumple **2 o más**:

- [ ] RAM Fly &gt; 80 % durante 3+ días
- [ ] Más de **2 reinicios** no planificados en la semana
- [ ] Más de **5 errores 429** Anthropic en un día
- [ ] **20+** negocios con WhatsApp conectado en un solo VPS
- [ ] Tiempo de respuesta del bot &gt; **45 s** habitual en pico (reportes reales)
- [ ] Costo Haiku &gt; **50 %** de ingresos mensuales recurrentes (MRR)

Si solo hay Básicos en 200/200 conversaciones → es **límite de plan**, no VPS (ofrecer Pro).

---

## 6. Qué NO es señal de saturación VPS

| Síntoma | Causa probable |
|---------|----------------|
| “No hay cita en sistema” | Contexto/cliente en DB, no RAM |
| Bot formal/casual incorrecto | Prompt / tono |
| “Waiting for message” iPhone | E2E / LID Baileys |
| Cliente nuevo Básico bloqueado al mes | Límite 200 conversaciones (código) |
| Stripe / login | Vercel, no VPS |

---

## 7. Contactos y comandos útiles

```bash
# Logs en vivo
fly logs -a apuntado-vps

# Estado máquinas
fly status -a apuntado-vps

# SSH (diagnóstico)
fly ssh console -a apuntado-vps

# Deploy tras cambiar fly.toml
cd vps && fly deploy
```

**Dashboard:** https://apuntado.app  
**Fly:** https://fly.io/apps/apuntado-vps/monitoring  
**Anthropic:** consola de billing / usage limits  

---

## 8. Resumen en una línea

| Etapa | Negocios (orden de magnitud) | Acción principal |
|-------|------------------------------|------------------|
| Hoy | 1–10 | Nada; monitorear |
| Amarillo | 10–25 | 2 GB RAM en Fly |
| Rojo | 25–40 | 2 GB + 2 CPU o 2.º VPS (con dev) |
| Escala | 40+ | Shard + cola IA + alertas |

---

*Última actualización: alineado con repo `main` (1 VPS, plan Básico 200 conv/mes, pago HN solo por WhatsApp +50498823627). Revisar este doc cuando cambie `fly.toml`, el modelo Haiku o la arquitectura multi-VPS.*
