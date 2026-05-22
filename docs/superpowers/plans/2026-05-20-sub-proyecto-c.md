# Sub-proyecto C — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los follow-ups del sub-proyecto B y, en el mismo flujo, incorporar el trabajo paralelo de la rama `fronted-nicolas` (3 páginas nuevas + mejoras a uploads) reskineado al design system. Activar Phantoms aprobados (Ajustes), refactorizar `analyze` a Server Component, rediseñar `uploads/[id]` a light theme, adoptar tokens platform en la landing, y agregar error/loading boundaries.

**Architecture:** Trabajamos en una rama `merge/fronted-nicolas-into-main` creada desde `main`. La estrategia de merge con `fronted-nicolas` es **conceptual**: copiamos los archivos nuevos (Modelo, Reportes, Reportes/download) y reskinea­mos al design system; portamos manualmente las mejoras de uploads (search + case_ref) a las versiones design-system del `main` actual; eliminamos la campana del Header; agregamos links en Sidebar. Cero `git merge` literal — evita arrastrar código pre-design-system. Commits con `Co-Authored-By: Nicolás Chávez Oliveros`.

**Tech Stack:** Next.js 16 App Router + React 19 + Tailwind 4 + TypeScript + Supabase SSR + lucide-react. Sin librerías nuevas.

**Spec source:** [`docs/superpowers/specs/2026-05-20-sub-proyecto-c-design.md`](../specs/2026-05-20-sub-proyecto-c-design.md) — léela antes de empezar. Este plan es la transcripción ejecutable.

**Verificación:** Este repo no tiene Vitest/Jest. La verificación es `cd apps/web && npm run build` + `npm run lint` + greps de los success criteria + slash command `/oncoscan-a11y` manual + test manual visual. No agregar tests unitarios — fuera de scope.

**Commits:** Mensajes en español, formato `tipo: descripción breve` (ver `CLAUDE.md` raíz). Cuando el cambio adopta trabajo de `fronted-nicolas`, agregar trailer `Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>` además del de Claude.

**Reglas inviolables:**

1. No tocar `apps/api/` ni el schema Supabase.
2. No loguear PHI (`email`, `Case_Ref`, `result_json`, `storage_path`, rutas DICOM, predicción IA).
3. No exponer URLs de Storage al cliente sin signed URL server-side.
4. No agregar librerías nuevas.

---

## Checkpoints

Este plan tiene **8 checkpoints**. Al cerrar cada uno, reportar progreso al usuario (resumen de cambios + estado de `npm run build` y `npm run lint`) antes de continuar.

1. **Checkpoint 0** — Rama creada + Modelo/Reportes nuevos
2. **Checkpoint 1** — Dashboard reskineado + Header + Sidebar
3. **Checkpoint 2** — Uploads search + case_ref portados
4. **Checkpoint 3** — Página Ajustes + LogoutButton migrado
5. **Checkpoint 4** — `error.tsx` global + `loading.tsx` por ruta
6. **Checkpoint 5** — `analyze/page.tsx` refactor a Server Component
7. **Checkpoint 6** — `uploads/[id]/page.tsx` redesign a light theme
8. **Checkpoint 7** — Landing `app/page.tsx` adopta tokens platform + a11y sweep + cierre Jira

---

# Sección 0 — Setup y merge conceptual de `fronted-nicolas`

## Task 0.1: Crear rama de trabajo

**Files:** ninguno (operación git)

- [ ] **Step 1: Verificar estado limpio en main**

```bash
git status
git rev-parse --abbrev-ref HEAD
```

Expected: working tree clean, branch `main`. Si hay cambios sin commitear, parar y reportar al usuario.

- [ ] **Step 2: Asegurar main sincronizada con origin**

```bash
git fetch origin
git status -uno
```

Expected: `Your branch is up to date with 'origin/main'`. Si está detrás, hacer `git pull --ff-only` (no rebase, no merge). Si está adelante, reportar al usuario.

- [ ] **Step 3: Crear y cambiar a la rama de trabajo**

```bash
git checkout -b merge/fronted-nicolas-into-main
```

Expected: `Switched to a new branch 'merge/fronted-nicolas-into-main'`.

## Task 0.2: Importar `Modelo/page.tsx` desde fronted-nicolas (sin reskinear contenido)

**Files:**
- Create: `apps/web/src/app/platform/modelo/page.tsx` (**en minúscula**, no `Modelo/` como Nicolás)

> **Nota de naming:** En Next.js, la URL `/platform/modelo` corresponde al directorio `apps/web/src/app/platform/modelo/`. Nicolás usó `Modelo/` con M mayúscula que en Linux/macOS produce ruta `/platform/Modelo`. Renombramos a minúsculas para evitar problemas en sistemas case-sensitive y para consistencia con el resto del repo.

- [ ] **Step 1: Recuperar el archivo desde fronted-nicolas y guardarlo en el path correcto**

```bash
mkdir -p apps/web/src/app/platform/modelo
git show origin/fronted-nicolas:apps/web/src/app/platform/Modelo/page.tsx > apps/web/src/app/platform/modelo/page.tsx
```

Expected: archivo creado, 133 líneas. Inspeccionar con `Read` que el contenido empieza con `import { PageContainer } from "@/components/ui/PageContainer";`.

- [ ] **Step 2: Reskinear el archivo eliminando colores no-design-system**

Abrir [apps/web/src/app/platform/modelo/page.tsx](apps/web/src/app/platform/modelo/page.tsx) y aplicar estos reemplazos exactos:

| Buscar (Edit con old_string) | Reemplazar por (new_string) |
|------------------------------|-----------------------------|
| `<div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">` | `<div className="bg-brand-primary rounded-2xl border border-brand-primary-hover p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">` |
| `<div className="w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center justify-center shrink-0">` | `<div className="w-12 h-12 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center shrink-0">` |
| `<Brain className="w-6 h-6 text-sky-400" />` | `<Brain className="w-6 h-6 text-white" aria-hidden="true" />` |
| `<p className="text-xs text-sky-400 font-bold uppercase tracking-widest mb-1">Versión activa</p>` | `<p className="text-xs text-white/80 font-bold uppercase tracking-widest mb-1">Versión activa</p>` |
| `<p className="text-slate-400 text-sm mt-2 max-w-2xl">` | `<p className="text-white/80 text-sm mt-2 max-w-2xl">` |
| `<div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">` | `<div className="flex items-center gap-3 p-3 rounded-xl bg-brand-danger/5 border border-brand-danger/20">` |
| `<div className="h-2 flex-1 rounded-full bg-red-200 overflow-hidden"><div className="h-full bg-brand-danger w-[90%]"/></div>` | `<div className="h-2 flex-1 rounded-full bg-brand-danger/20 overflow-hidden"><div className="h-full bg-brand-danger w-[90%]"/></div>` |

También agregar `aria-hidden="true"` a TODOS los iconos `<Brain />`, `<Database />`, `<Layers />`, `<BarChart3 />`, `<ShieldCheck />`, `<AlertTriangle />` que sean puramente decorativos (todos lo son en esta página).

- [ ] **Step 3: Agregar disclaimer académico al inicio del contenido**

El contenido habla de ISIC/EfficientNet (cáncer de piel) cuando OncoScan es cáncer pulmonar. El usuario aprobó dejar el contenido pero necesita disclaimer explícito.

Editar el archivo y JUSTO DESPUÉS del bloque `<SectionHeader ... />`, agregar este import al top:

```tsx
import { AlertBanner } from "@/components/ui/AlertBanner";
```

Y antes del primer `<div className="bg-brand-primary rounded-2xl ...">`, insertar:

```tsx
<AlertBanner
    variant="warning"
    title="Contenido pendiente de validación clínica"
    description="La información técnica de esta página está pendiente de revisión por el equipo de IA del proyecto. No usar como referencia para decisiones clínicas reales."
    className="mb-6"
/>
```

- [ ] **Step 4: Verificar build y lint**

```bash
cd apps/web && npm run build && npm run lint
```

Expected: build green, lint green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/platform/modelo/page.tsx
git commit -m "$(cat <<'EOF'
feat: pagina Modelo IA portada desde fronted-nicolas y reskineada

Adopta Modelo/page.tsx de fronted-nicolas con estos cambios:
- Renombrado de Modelo/ a modelo/ (case-sensitive)
- Reskin completo al design system (eliminado slate-900, sky-400, red-50/200)
- Agregado AlertBanner warning con disclaimer de contenido pendiente
- aria-hidden en iconos decorativos

Contenido original (ISIC/EfficientNet) se mantiene pendiente de
validacion por Luis (AI Engineer) en sub-proyecto D.

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 0.3: Importar `Reportes/page.tsx` desde fronted-nicolas y reskinear

**Files:**
- Create: `apps/web/src/app/platform/reportes/page.tsx`

- [ ] **Step 1: Recuperar archivo en el path en minúscula**

```bash
mkdir -p apps/web/src/app/platform/reportes
git show origin/fronted-nicolas:apps/web/src/app/platform/Reportes/page.tsx > apps/web/src/app/platform/reportes/page.tsx
```

- [ ] **Step 2: Reescribir el archivo con design system**

El archivo original mezcla cards dark theme (`bg-slate-900`, `bg-slate-800`) y light theme; reescribirlo completo a light theme consistente. Reemplazar TODO el contenido de [apps/web/src/app/platform/reportes/page.tsx](apps/web/src/app/platform/reportes/page.tsx) por:

```tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import Link from "next/link";
import { FileText, Download, BarChart3, ShieldAlert, ClipboardList } from "lucide-react";

export default async function ReportesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { count: totalUploads } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true });

    const { count: altosRiesgo } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true })
        .eq("ai_risk_level", "ALTO");

    const { count: analizados } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true })
        .eq("upload_status", "analyzed");

    return (
        <PageContainer>
            <SectionHeader
                title="Exportar Reportes"
                description="Genera y descarga reportes clínicos del historial de análisis IA."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total estudios</p>
                            <p className="text-2xl font-bold text-slate-800">{totalUploads ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Analizados</p>
                            <p className="text-2xl font-bold text-slate-800">{analizados ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-brand-danger/20 bg-brand-danger/5">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-danger/10 rounded-xl flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-brand-danger" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-brand-danger font-semibold uppercase tracking-wider">Riesgo Alto</p>
                            <p className="text-2xl font-bold text-brand-danger">{altosRiesgo ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tipos de reporte disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ReportCard
                    icon={<FileText className="w-5 h-5 text-brand-primary" aria-hidden="true" />}
                    iconBg="bg-brand-primary/10"
                    badge="REPORTE COMPLETO"
                    badgeStyle="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                    title="Reporte Completo"
                    description="Todos los estudios con resultados IA, score, nivel de riesgo y recomendación clínica."
                    href="/platform/reportes/download?tipo=completo"
                />
                <ReportCard
                    icon={<ShieldAlert className="w-5 h-5 text-brand-danger" aria-hidden="true" />}
                    iconBg="bg-brand-danger/10"
                    badge="ALERTAS CRÍTICAS"
                    badgeStyle="bg-brand-danger/10 text-brand-danger border-brand-danger/20"
                    title="Casos de Riesgo Alto"
                    description="Filtrado exclusivo de estudios con nivel de riesgo ALTO. Ideal para revisión urgente."
                    href="/platform/reportes/download?tipo=alto_riesgo"
                    danger
                />
                <ReportCard
                    icon={<BarChart3 className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
                    iconBg="bg-emerald-50"
                    badge="ESTADÍSTICO"
                    badgeStyle="bg-emerald-50 text-emerald-700 border-emerald-200"
                    title="Resumen Estadístico"
                    description="Distribución de niveles de riesgo, scores promedio y métricas de uso del modelo IA."
                    href="/platform/reportes/download?tipo=estadistico"
                />
                <ReportCard
                    icon={<ClipboardList className="w-5 h-5 text-brand-primary" aria-hidden="true" />}
                    iconBg="bg-brand-primary/10"
                    badge="POR REFERENCIA"
                    badgeStyle="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                    title="Estudios con Referencia"
                    description="Solo estudios que tienen una referencia de caso asignada (campo case_ref)."
                    href="/platform/reportes/download?tipo=con_referencia"
                />
            </div>

            <p className="text-xs text-slate-400 mt-8 text-center">
                Los reportes generados son de uso clínico interno. No compartir fuera del sistema sin autorización.
            </p>
        </PageContainer>
    );
}

function ReportCard({
    icon, iconBg, badge, badgeStyle, title, description, href, danger = false,
}: {
    icon: React.ReactNode;
    iconBg: string;
    badge: string;
    badgeStyle: string;
    title: string;
    description: string;
    href: string;
    danger?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                        {icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                        {badge}
                    </span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                </div>
                <Link
                    href={href}
                    className={`${buttonVariants({ variant: danger ? "danger" : "primary", size: "md" })} mt-2 w-full`}
                >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Descargar CSV
                </Link>
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 3: Verificar build**

```bash
cd apps/web && npm run build
```

Expected: build green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/platform/reportes/page.tsx
git commit -m "$(cat <<'EOF'
feat: pagina Reportes portada desde fronted-nicolas y reskineada

Adopta Reportes/page.tsx de fronted-nicolas con estos cambios:
- Renombrado de Reportes/ a reportes/ (case-sensitive)
- Reescritura completa al design system (eliminado bg-slate-900, sky-400, red-50)
- Cards consistentes light theme con Card + buttonVariants
- aria-hidden en iconos decorativos
- ReportDownloadButton extraido a ReportCard component reutilizable

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 0.4: Importar `Reportes/download/route.ts`

**Files:**
- Create: `apps/web/src/app/platform/reportes/download/route.ts`

- [ ] **Step 1: Recuperar archivo desde fronted-nicolas**

```bash
mkdir -p apps/web/src/app/platform/reportes/download
git show origin/fronted-nicolas:apps/web/src/app/platform/Reportes/download/route.ts > apps/web/src/app/platform/reportes/download/route.ts
```

- [ ] **Step 2: Cambiar el comportamiento de no-auth de `redirect()` a `401`**

Un endpoint de descarga no debería redireccionar. Si el usuario no está autenticado, devolver 401. Esto evita que un archivo CSV con `Content-Disposition: attachment` haga un redirect HTML extraño.

Editar [apps/web/src/app/platform/reportes/download/route.ts](apps/web/src/app/platform/reportes/download/route.ts) y reemplazar:

```ts
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
```

Por:

```ts
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
```

- [ ] **Step 3: Verificar manualmente que RLS está activa en Supabase**

**Tarea para el usuario** (no automatizable desde el plan):

> **Acción requerida del usuario:** Abrir Supabase Studio → Authentication → Policies → `dicom_uploads`. Verificar que existe una policy de tipo `SELECT` que filtra por `auth.uid() = user_id` (o similar). Si NO existe, **el download de CSV expondrá registros de todos los usuarios**. Reportar resultado al ejecutor antes de hacer commit.

Si RLS no está activa, agregar al plan una tarea de remediación (que NO toca el schema pero sí agrega una policy). Esto puede salir de scope — discutir con el usuario.

- [ ] **Step 4: Verificar build**

```bash
cd apps/web && npm run build
```

- [ ] **Step 5: Commit (solo si RLS está confirmada activa)**

```bash
git add apps/web/src/app/platform/reportes/download/route.ts
git commit -m "$(cat <<'EOF'
feat: endpoint de descarga CSV de reportes desde fronted-nicolas

Adopta Reportes/download/route.ts de fronted-nicolas con:
- Renombrado a reportes/download/route.ts (case-sensitive)
- Cambio de redirect a 401 cuando no hay sesion (es un endpoint de descarga, no HTML)

Tipos soportados: completo, alto_riesgo, estadistico, con_referencia.

Depende de RLS activa en dicom_uploads para filtrar por usuario.

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 0.5: Reportar Checkpoint 0

- [ ] **Step 1: Resumir al usuario**

Reportar:
- Rama `merge/fronted-nicolas-into-main` creada desde `main`.
- 3 archivos nuevos: `modelo/page.tsx`, `reportes/page.tsx`, `reportes/download/route.ts`.
- 3 commits con co-authorship de Nicolás.
- Build verde, lint verde.
- **Bloqueo posible**: confirmar que el usuario verificó RLS en Supabase antes de continuar.

Esperar luz verde antes de avanzar a Sección 1.

---

# Sección 1 — Dashboard + Header + Sidebar (adoptar cambios de Nicolás)

## Task 1.1: Rediseñar dashboard adoptando estructura de Nicolás

**Files:**
- Modify: `apps/web/src/app/platform/page.tsx`

- [ ] **Step 1: Reemplazar contenido completo del dashboard**

Reemplazar TODO el contenido de [apps/web/src/app/platform/page.tsx](apps/web/src/app/platform/page.tsx) por:

```tsx
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import {
    Upload, FileStack, Brain, FileText, CheckCircle2, ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";

type RecentUpload = {
    id: string;
    original_name: string;
    ai_risk_level: string | null;
    ai_score: number | null;
    upload_status: string;
    created_at: string;
    file_type: string;
    metadata_json: Record<string, unknown> | null;
};

function asRiskLevel(level: string | null): RiskLevel | null {
    if (level === "ALTO" || level === "MEDIO" || level === "BAJO") return level;
    return null;
}

export default async function PlatformPage() {
    const supabase = await createClient();

    const { count: totalUploads } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true });

    const { count: altosRiesgo } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true })
        .eq("ai_risk_level", "ALTO");

    const { count: analizados } = await supabase
        .from("dicom_uploads")
        .select("*", { count: "exact", head: true })
        .eq("upload_status", "analyzed");

    const { data: recientes } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, ai_risk_level, ai_score, upload_status, created_at, file_type, metadata_json")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<RecentUpload[]>();

    return (
        <PageContainer>
            {/* Hero banner */}
            <div className="bg-brand-primary text-white px-8 py-8 mb-8 rounded-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">OncoScan AI — MVP v1.0</p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                    Dashboard General
                </h1>
                <p className="text-white/80 text-sm mt-2 max-w-xl">
                    Plataforma de apoyo diagnóstico oncológico mediante inteligencia artificial. Los resultados son referenciales y no sustituyen el criterio médico.
                </p>
            </div>

            <div className="space-y-8">
                {/* KPIs reales */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Métricas Operativas</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Estudios</p>
                                    <FileStack className="w-4 h-4 text-slate-400" aria-hidden="true" />
                                </div>
                                <p className="text-3xl font-extrabold text-slate-800">{totalUploads ?? 0}</p>
                                <Link href="/platform/uploads" className="text-xs text-brand-primary font-medium hover:underline">Ver historial →</Link>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analizados</p>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                                </div>
                                <p className="text-3xl font-extrabold text-emerald-600">{analizados ?? 0}</p>
                                <p className="text-xs text-slate-400 font-medium">Con resultado IA</p>
                            </CardContent>
                        </Card>

                        <Card className="border-brand-danger/20 bg-brand-danger/5">
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-brand-danger uppercase tracking-wider">Riesgo Alto</p>
                                    <ShieldAlert className="w-4 h-4 text-brand-danger" aria-hidden="true" />
                                </div>
                                <p className="text-3xl font-extrabold text-brand-danger">{altosRiesgo ?? 0}</p>
                                <Link href="/platform/alertas" className="text-xs text-brand-danger font-medium hover:underline">Ver alertas →</Link>
                            </CardContent>
                        </Card>

                        <Card className="bg-brand-primary text-white border-brand-primary-hover">
                            <CardContent className="p-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Modelo Activo</p>
                                    <Brain className="w-4 h-4 text-white/80" aria-hidden="true" />
                                </div>
                                <p className="text-base font-bold text-white mt-1">multimodal-v1.0</p>
                                <Link href="/platform/modelo" className="text-xs text-white/80 font-medium hover:underline">Ver detalles →</Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Acciones rápidas */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/platform/upload"
                            className="group bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl p-6 flex flex-col gap-3 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                                <Upload className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Subir Estudio DICOM</p>
                                <p className="text-white/80 text-xs mt-1">Carga archivos .dcm o imágenes para análisis IA</p>
                            </div>
                        </Link>

                        <Link
                            href="/platform/uploads"
                            className="group bg-brand-surface border border-slate-200 hover:border-brand-primary text-slate-800 rounded-2xl p-6 flex flex-col gap-3 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-primary/10">
                                <FileStack className="w-5 h-5 text-slate-600 group-hover:text-brand-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Historial DICOM</p>
                                <p className="text-slate-500 text-xs mt-1">Revisa y filtra todos los estudios analizados</p>
                            </div>
                        </Link>

                        <Link
                            href="/platform/reportes"
                            className="group bg-brand-surface border border-slate-200 hover:border-brand-primary text-slate-800 rounded-2xl p-6 flex flex-col gap-3 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-primary/10">
                                <FileText className="w-5 h-5 text-slate-600 group-hover:text-brand-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-base">Exportar Reportes</p>
                                <p className="text-slate-500 text-xs mt-1">Descarga reportes CSV clínicos en varios formatos</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Actividad reciente */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Actividad Reciente</h2>
                        <Link href="/platform/uploads" className="text-xs text-brand-primary font-semibold hover:underline">Ver todo →</Link>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {!recientes || recientes.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 text-sm">
                                    No hay estudios aún. <Link href="/platform/upload" className="text-brand-primary underline">Sube el primero</Link>.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {recientes.map((u) => {
                                        const isAnalysis = u.file_type === "png_analysis";
                                        const href = isAnalysis ? `/platform/analyze/${u.id}` : `/platform/uploads/${u.id}`;
                                        return (
                                            <li key={u.id}>
                                                <Link
                                                    href={href}
                                                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        {isAnalysis
                                                            ? <Brain className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                                                            : <FileStack className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{u.original_name}</p>
                                                        <p className="text-xs text-slate-500">{new Date(u.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <RiskBadge level={asRiskLevel(u.ai_risk_level)} />
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 2: Exportar el tipo `RiskLevel` desde `RiskBadge.tsx`**

El nuevo dashboard importa `type RiskLevel` desde el componente compartido. Verificar que está exportado.

Leer [apps/web/src/components/ui/RiskBadge.tsx](apps/web/src/components/ui/RiskBadge.tsx). Si la línea `export type RiskLevel` ya existe (linea 3 según el código actual), no hacer cambios. Si no existe, agregarla.

- [ ] **Step 3: Verificar build**

```bash
cd apps/web && npm run build
```

Expected: build green. Si hay error sobre `RiskLevel`, revisar el import en `page.tsx` y el export en `RiskBadge.tsx`.

- [ ] **Step 4: Verificar visual**

> **Acción requerida del usuario:** Ejecutar `cd apps/web && npm run dev` y abrir [http://localhost:3000/platform](http://localhost:3000/platform). Verificar:
> - Hero banner azul oscuro arriba con título y descripción.
> - 4 KPIs en grid, el 3ro raspberry, el 4to azul oscuro.
> - 3 cards de acciones rápidas (Subir, Historial, Reportes).
> - Lista de actividad reciente con riesgo badges.
> - Sin secciones "Próximamente" dummy.
> - Sin errores de hidratación en la consola.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/platform/page.tsx apps/web/src/components/ui/RiskBadge.tsx
git commit -m "$(cat <<'EOF'
feat: rediseno del dashboard adoptando estructura de fronted-nicolas

Reemplaza el dashboard "Modulos Inteligentes (Proximamente)" dummy por:
- Hero banner con titulo y descripcion clinica
- 4 KPIs reales (Total Estudios, Analizados, Riesgo Alto, Modelo Activo)
- 3 Acciones rapidas (Subir, Historial, Reportes)
- Lista de Actividad Reciente con RiskBadge compartido

Estructura inspirada en fronted-nicolas pero reskineada al design system
(brand-primary, brand-danger en vez de slate-900/sky-400/red-200) y usando
Card, RiskBadge, PageContainer compartidos.

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 1.2: Eliminar campana de notificaciones del Header

**Files:**
- Modify: `apps/web/src/components/layout/Header.tsx`

- [ ] **Step 1: Eliminar el bloque `PhantomButton` de Notificaciones**

Reemplazar el contenido completo de [apps/web/src/components/layout/Header.tsx](apps/web/src/components/layout/Header.tsx) por:

```tsx
"use client";

import { User } from "lucide-react";
import LogoutButton from "@/app/platform/logout-button";

export function Header({ userEmail = "Usuario" }: { userEmail?: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <span className="text-lg font-bold text-brand-primary tracking-tight">OncoScan</span>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
          <User className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{userEmail}</p>
          <p className="text-xs text-slate-500">Médico</p>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
```

Cambios respecto al actual:
- Eliminado el `import { Bell }` y el bloque `<PhantomButton>` de Notificaciones.
- Eliminado el `import { PhantomButton }`.
- Eliminado el `import React`.
- Reducido el `gap-4` del flex contenedor a `gap-3` y removido el `border-l border-slate-200 pl-4` (ya no hay separador visual entre nada).

> **Nota:** `LogoutButton` se mantiene aquí *temporalmente*. La Task 3.3 lo mueve a la nueva página `/platform/ajustes`.

- [ ] **Step 2: Verificar build**

```bash
cd apps/web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/Header.tsx
git commit -m "$(cat <<'EOF'
feat: eliminar icono de notificaciones del Header

Adopta el cambio de fronted-nicolas que elimina la campana Phantom.
Resuelve el follow-up "Notificaciones Phantom" del sub-proyecto B por
eliminacion (en vez de activacion).

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 1.3: Sidebar — agregar links a Reportes y Modelo IA + activar Phantom Ajustes (parcial)

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

> **Nota:** La activación del Phantom `Ajustes` se completa en Sección 3 cuando se crea la página. Aquí solo añadimos los dos links de Nicolás.

- [ ] **Step 1: Editar la sección "Clínico Real" para agregar Modelo IA**

Buscar en [apps/web/src/components/layout/Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx) el bloque del link de Centro de Alertas (líneas ~77-83):

```tsx
        <Link
          href="/platform/alertas"
          className={`${linkBase} ${isActive("/platform/alertas") ? linkActive : linkInactive}`}
        >
          <Bell className="w-5 h-5 text-brand-danger" aria-hidden="true" />
          Centro de Alertas
        </Link>
```

Y JUSTO DESPUÉS de ese bloque (antes de `<div className="my-6 border-t border-white/10"></div>`), agregar:

```tsx
        <Link
          href="/platform/modelo"
          className={`${linkBase} ${isActive("/platform/modelo") ? linkActive : linkInactive}`}
        >
          <Cpu className="w-5 h-5" aria-hidden="true" />
          Modelo IA
        </Link>
```

- [ ] **Step 2: Agregar `Cpu` al import de lucide-react**

Buscar la línea de imports de iconos (línea ~5):

```tsx
import { LayoutDashboard, Users, Bell, Brain, FileText, Settings, Upload, FileStack } from "lucide-react";
```

Reemplazar por:

```tsx
import { LayoutDashboard, Users, Bell, Brain, Cpu, FileText, Settings, Upload, FileStack } from "lucide-react";
```

- [ ] **Step 3: Reemplazar PhantomLink "Exportación de Reportes" por Link real**

Buscar el bloque (líneas ~105-111):

```tsx
        <PhantomLink
          featureName="Exportación de Reportes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          Exportar Reportes
        </PhantomLink>
```

Reemplazar por:

```tsx
        <Link
          href="/platform/reportes"
          className={`${linkBase} ${isActive("/platform/reportes") ? linkActive : linkInactive}`}
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          Exportar Reportes
        </Link>
```

- [ ] **Step 4: Verificar build y visual**

```bash
cd apps/web && npm run build
```

> **Acción requerida del usuario:** Abrir [http://localhost:3000/platform](http://localhost:3000/platform) y verificar que el Sidebar muestra:
> - Modelo IA en la sección "Clínico Real" (debajo de Centro de Alertas)
> - Exportar Reportes en la sección "Sistema" (no más Phantom con opacidad 60)
> - Ajustes y Pacientes Registrados siguen siendo Phantom (no cambian aún)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: Sidebar - agregar links a Modelo IA y Exportar Reportes

- Nuevo link "Modelo IA" en la seccion Clinico Real (lucide icon Cpu)
- Reemplaza PhantomLink "Exportar Reportes" por Link real a /platform/reportes

Adopta los cambios de fronted-nicolas, manteniendo el styling con tokens
brand-sidebar y focus rings del design system.

Phantom "Ajustes" se activa en Seccion 3 cuando se cree /platform/ajustes.
Phantom "Pacientes Registrados" se mantiene como Phantom (sin schema).

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 1.4: Reportar Checkpoint 1

- [ ] **Step 1: Resumir al usuario**

Reportar:
- Dashboard rediseñado con KPIs reales + Actividad reciente + Acciones rápidas.
- Header sin campana de notificaciones.
- Sidebar con Modelo IA y Reportes como Links reales (no Phantom).
- 3 commits, build verde.

Esperar luz verde antes de avanzar a Sección 2.

---

# Sección 2 — Portar mejoras de uploads (search + case_ref)

## Task 2.1: Agregar búsqueda al `uploads/page.tsx` con escape de input

**Files:**
- Modify: `apps/web/src/app/platform/uploads/page.tsx`

- [ ] **Step 1: Leer el archivo actual**

Leer [apps/web/src/app/platform/uploads/page.tsx](apps/web/src/app/platform/uploads/page.tsx) completo para entender la estructura actual (post sub-proyecto B). El plan asume que hoy es Server Component que renderiza tabla con `Table*` components y `RiskBadge`.

- [ ] **Step 2: Modificar la firma de `UploadsPage` para aceptar searchParams**

Buscar la firma actual del componente:

```tsx
export default async function UploadsPage() {
```

Reemplazar por:

```tsx
type PageProps = {
    searchParams: Promise<{ q?: string }>;
};

export default async function UploadsPage({ searchParams }: PageProps) {
    const { q } = await searchParams;
```

- [ ] **Step 3: Implementar el filtro con escape seguro**

Buscar la query a `dicom_uploads`. Antes:

```tsx
    const supabase = await createClient();

    const { data: uploads, error } = await supabase
        .from("dicom_uploads")
        .select("...")
        .order("created_at", { ascending: false });
```

Reemplazar por (manteniendo el `select(...)` original; solo se reorganiza para aplicar el filtro opcional):

```tsx
    const supabase = await createClient();

    let query = supabase
        .from("dicom_uploads")
        .select("...")  // ← mantener el select tal como estaba
        .order("created_at", { ascending: false });

    if (q && q.trim()) {
        // Escapar caracteres que Supabase interpreta como separadores/wildcards en .or() filters.
        // Comas separan condiciones, parentesis y comillas pueden romper la sintaxis.
        // % y _ son wildcards en ilike y deben escaparse con \.
        const escaped = q
            .trim()
            .replace(/\\/g, "\\\\")
            .replace(/[%_]/g, "\\$&")
            .replace(/[,()'"]/g, "");
        query = query.or(
            `original_name.ilike.%${escaped}%,metadata_json->>case_ref.ilike.%${escaped}%`
        );
    }

    const { data: uploads, error } = await query;
```

> **Importante:** dejar el `.select("...")` con el contenido EXACTO que ya tenía el archivo. No cambiar las columnas seleccionadas.

- [ ] **Step 4: Agregar el formulario de búsqueda en el JSX**

Justo después del `<SectionHeader ... />` y antes del bloque principal de la tabla, agregar:

```tsx
            <form method="GET" className="mb-6">
                <div className="flex gap-3">
                    <label htmlFor="search-uploads" className="sr-only">Buscar por nombre o referencia</label>
                    <input
                        id="search-uploads"
                        type="text"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Buscar por nombre de archivo o referencia del caso..."
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary outline-none transition-all shadow-sm"
                    />
                    <button
                        type="submit"
                        className={buttonVariants({ variant: "primary", size: "md" })}
                    >
                        Buscar
                    </button>
                    {q && q.trim() && (
                        <Link
                            href="/platform/uploads"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Limpiar
                        </Link>
                    )}
                </div>
                {q && q.trim() && (
                    <p className="text-xs text-slate-500 mt-2">
                        Resultados para: <span className="font-medium text-slate-700">&ldquo;{q.trim()}&rdquo;</span>
                    </p>
                )}
            </form>
```

- [ ] **Step 5: Asegurar imports necesarios**

Verificar que el archivo tiene estos imports al top (agregar los que falten):

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
```

- [ ] **Step 6: Verificar build**

```bash
cd apps/web && npm run build
```

- [ ] **Step 7: Verificar funcional**

> **Acción requerida del usuario:** Abrir [http://localhost:3000/platform/uploads](http://localhost:3000/platform/uploads). Probar:
> - Búsqueda con un término que matchee un archivo (ej. parte del `original_name`).
> - Búsqueda con un término que matchee `metadata_json.case_ref` si existen estudios con referencia.
> - Búsqueda con `,` y `(` — debe no romper, solo filtrar literalmente sin esos caracteres.
> - Botón Limpiar regresa a la lista completa.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/platform/uploads/page.tsx
git commit -m "$(cat <<'EOF'
feat: busqueda en historial DICOM por nombre y referencia

Adopta la funcionalidad de busqueda de fronted-nicolas pero con escape
seguro de input antes de pasarlo al filtro .or() de Supabase. Evita
posible filter injection si el usuario incluye comas o parentesis en
el termino de busqueda.

Form GET con label sr-only, focus rings consistentes con design system,
boton Limpiar cuando hay query activa.

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 2.2: Reportar Checkpoint 2

- [ ] **Step 1: Resumir al usuario**

Reportar:
- Búsqueda en uploads/page.tsx con escape seguro implementada.
- 1 commit.
- Build verde.

> El campo `case_ref` en `uploads/[id]/page.tsx` se integra en Sección 6 (rediseño completo del detail).

Esperar luz verde antes de avanzar a Sección 3.

---

# Sección 3 — Página `/platform/ajustes` + LogoutButton migrado

## Task 3.1: Crear página `/platform/ajustes/page.tsx`

**Files:**
- Create: `apps/web/src/app/platform/ajustes/page.tsx`

- [ ] **Step 1: Crear el directorio y archivo**

```bash
mkdir -p apps/web/src/app/platform/ajustes
```

- [ ] **Step 2: Escribir la página Server Component**

Crear [apps/web/src/app/platform/ajustes/page.tsx](apps/web/src/app/platform/ajustes/page.tsx) con:

```tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck, Settings } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import LogoutButton from "@/app/platform/logout-button";

export default async function AjustesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <PageContainer maxWidth="3xl">
            <SectionHeader
                title="Ajustes"
                description="Información de tu cuenta y preferencias de la plataforma."
            />

            <Card className="mb-6">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Perfil</h2>
                    <dl className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Correo electrónico</dt>
                                <dd className="text-sm font-medium text-slate-800 mt-0.5 break-all">{user.email}</dd>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</dt>
                                <dd className="text-sm font-medium text-slate-800 mt-0.5">Médico</dd>
                            </div>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sesión</h2>
                    <p className="text-sm text-slate-600 mb-4">
                        Cierra sesión para volver a la pantalla de login. Tu próxima visita requerirá autenticación.
                    </p>
                    <LogoutButton />
                </CardContent>
            </Card>

            <AlertBanner
                variant="info"
                title="Preferencias (próximamente)"
                description="Configuración de tema, idioma y notificaciones llegará en futuras versiones de la plataforma."
            />
        </PageContainer>
    );
}
```

- [ ] **Step 3: Verificar build**

```bash
cd apps/web && npm run build
```

## Task 3.2: Migrar LogoutButton al design system

**Files:**
- Modify: `apps/web/src/app/platform/logout-button.tsx`

- [ ] **Step 1: Reescribir LogoutButton usando `Button` del design system**

Reemplazar TODO el contenido de [apps/web/src/app/platform/logout-button.tsx](apps/web/src/app/platform/logout-button.tsx) por:

```tsx
"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LogoutButton() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={loading}
            onClick={handleLogout}
        >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Cerrar sesión
        </Button>
    );
}
```

Cambios respecto al original:
- Pasa de `<button>` raw a `<Button variant="secondary" size="sm">`.
- Agrega icono `LogOut` con `aria-hidden`.
- Agrega estado `loading` para feedback durante el `signOut()`.
- Elimina las clases `border-slate-700 text-slate-200 hover:bg-slate-900` (dark theme).

- [ ] **Step 2: Verificar build**

```bash
cd apps/web && npm run build
```

## Task 3.3: Mover LogoutButton del Header a la página Ajustes

**Files:**
- Modify: `apps/web/src/components/layout/Header.tsx`

- [ ] **Step 1: Eliminar LogoutButton del Header**

Reemplazar TODO el contenido de [apps/web/src/components/layout/Header.tsx](apps/web/src/components/layout/Header.tsx) por:

```tsx
import { User } from "lucide-react";

export function Header({ userEmail = "Usuario" }: { userEmail?: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <span className="text-lg font-bold text-brand-primary tracking-tight">OncoScan</span>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
          <User className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{userEmail}</p>
          <p className="text-xs text-slate-500">Médico</p>
        </div>
      </div>
    </header>
  );
}
```

Cambios:
- Eliminado `"use client"` (ya no usa hooks ni event handlers).
- Eliminado import `LogoutButton` y su uso en el JSX.

## Task 3.4: Sidebar — activar Phantom "Ajustes"

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Reemplazar PhantomLink Ajustes por Link real**

Buscar en [apps/web/src/components/layout/Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx) el bloque:

```tsx
        <PhantomLink
          featureName="Ajustes de Plataforma"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
          Ajustes
        </PhantomLink>
```

Reemplazar por:

```tsx
        <Link
          href="/platform/ajustes"
          className={`${linkBase} ${isActive("/platform/ajustes") ? linkActive : linkInactive}`}
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
          Ajustes
        </Link>
```

- [ ] **Step 2: Verificar build y visual**

```bash
cd apps/web && npm run build
```

> **Acción requerida del usuario:** Abrir [http://localhost:3000/platform/ajustes](http://localhost:3000/platform/ajustes). Verificar:
> - Renderiza con email + rol + botón Cerrar sesión.
> - Botón Cerrar sesión es `secondary size=sm` con ícono LogOut.
> - El Header ya NO muestra "Cerrar sesión".
> - El Sidebar marca "Ajustes" como activo cuando estás en la página.
> - Botón Cerrar sesión funciona y redirige a /login.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/platform/ajustes/page.tsx apps/web/src/app/platform/logout-button.tsx apps/web/src/components/layout/Header.tsx apps/web/src/components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: pagina /platform/ajustes + LogoutButton migrado al design system

- Nueva pagina Server Component /platform/ajustes con perfil + sesion + bloque preferencias
- LogoutButton refactorizado a Button variant=secondary size=sm con loading state e icono
- Header simplificado (sin LogoutButton, sin "use client", sin imports innecesarios)
- Sidebar - Phantom "Ajustes" reemplazado por Link real a /platform/ajustes

Resuelve los follow-ups del sub-proyecto B:
- LogoutButton invisible en el Header
- Phantom "Ajustes"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 3.5: Reportar Checkpoint 3

- [ ] **Step 1: Resumir al usuario**

Reportar:
- Página `/platform/ajustes` creada.
- `LogoutButton` migrado al design system.
- Header simplificado (sin LogoutButton, sin "use client").
- Sidebar Phantom Ajustes activado.
- 1 commit, build verde.

Esperar luz verde antes de avanzar a Sección 4.

---

# Sección 4 — `error.tsx` global + `loading.tsx` por ruta

## Task 4.1: Crear `error.tsx` global en `/platform`

**Files:**
- Create: `apps/web/src/app/platform/error.tsx`

- [ ] **Step 1: Crear el archivo**

Crear [apps/web/src/app/platform/error.tsx](apps/web/src/app/platform/error.tsx) con:

```tsx
"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";

export default function PlatformError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // NO loguear `error.message` ni `error.stack` aqui: podrian contener PHI
        // (rutas DICOM, Case_Ref, emails). Solo el digest no-PII.
        if (error.digest) {
            console.error("PlatformError digest:", error.digest);
        }
    }, [error]);

    return (
        <PageContainer maxWidth="2xl">
            <AlertBanner
                variant="error"
                title="No pudimos cargar esta sección"
                description="Ocurrió un error procesando la página. Intenta recargar; si el problema persiste, contacta al equipo del proyecto."
                className="mb-6"
            />
            <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={() => reset()}>
                    Reintentar
                </Button>
                <Button
                    variant="secondary"
                    size="md"
                    onClick={() => { window.location.href = "/platform"; }}
                >
                    Ir al Dashboard
                </Button>
            </div>
            {error.digest && (
                <p className="text-xs text-slate-400 mt-6">
                    Código de error: <span className="font-mono">{error.digest}</span>
                </p>
            )}
        </PageContainer>
    );
}
```

> **Razón del console.error sobre `digest`:** El `digest` es un hash anónimo generado por Next.js que NO contiene PHI. Lo logueamos para correlacionar con server logs sin filtrar info clínica.

- [ ] **Step 2: Verificar build**

```bash
cd apps/web && npm run build
```

## Task 4.2: Crear `loading.tsx` por ruta

**Files:** (10 archivos nuevos)
- Create: `apps/web/src/app/platform/loading.tsx`
- Create: `apps/web/src/app/platform/uploads/loading.tsx`
- Create: `apps/web/src/app/platform/uploads/[id]/loading.tsx`
- Create: `apps/web/src/app/platform/upload/loading.tsx`
- Create: `apps/web/src/app/platform/analyze/loading.tsx`
- Create: `apps/web/src/app/platform/analyze/[id]/loading.tsx`
- Create: `apps/web/src/app/platform/alertas/loading.tsx`
- Create: `apps/web/src/app/platform/ajustes/loading.tsx`
- Create: `apps/web/src/app/platform/reportes/loading.tsx`
- Create: `apps/web/src/app/platform/modelo/loading.tsx`

- [ ] **Step 1: Skeleton para Dashboard**

[apps/web/src/app/platform/loading.tsx](apps/web/src/app/platform/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function DashboardLoading() {
    return (
        <PageContainer>
            <div className="bg-slate-200 rounded-2xl h-32 mb-8 animate-pulse" />
            <div className="space-y-8">
                <div>
                    <div className="h-3 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-32 animate-pulse" />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="h-3 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-slate-200 rounded-2xl h-32 animate-pulse" />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="h-3 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
                    <div className="bg-white border border-slate-200 rounded-2xl h-64 animate-pulse" />
                </div>
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 2: Skeleton para Uploads (tabla)**

[apps/web/src/app/platform/uploads/loading.tsx](apps/web/src/app/platform/uploads/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function UploadsLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-72 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-12 bg-slate-200 rounded-xl mb-6 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-12 bg-slate-100 animate-pulse" />
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 border-t border-slate-100 bg-white animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 3: Skeleton para Upload detail**

[apps/web/src/app/platform/uploads/[id]/loading.tsx](apps/web/src/app/platform/uploads/[id]/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function UploadDetailLoading() {
    return (
        <PageContainer maxWidth="4xl">
            <div className="mb-8">
                <div className="h-7 w-80 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl h-64 animate-pulse" />
                <div className="bg-white border border-slate-200 rounded-2xl h-80 animate-pulse" />
                <div className="bg-white border border-slate-200 rounded-2xl h-48 animate-pulse" />
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 4: Skeleton para Upload form**

[apps/web/src/app/platform/upload/loading.tsx](apps/web/src/app/platform/upload/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function UploadLoading() {
    return (
        <PageContainer maxWidth="4xl">
            <div className="mb-8">
                <div className="h-7 w-64 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-12 w-40 bg-slate-200 rounded-xl animate-pulse" />
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 5: Skeleton para Analyze form**

[apps/web/src/app/platform/analyze/loading.tsx](apps/web/src/app/platform/analyze/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function AnalyzeLoading() {
    return (
        <PageContainer maxWidth="4xl">
            <div className="mb-8">
                <div className="h-7 w-72 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8">
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-12 w-48 bg-slate-200 rounded-xl animate-pulse" />
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 6: Skeleton para Analyze result**

[apps/web/src/app/platform/analyze/[id]/loading.tsx](apps/web/src/app/platform/analyze/[id]/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function AnalyzeResultLoading() {
    return (
        <PageContainer maxWidth="4xl">
            <div className="mb-8">
                <div className="h-7 w-72 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
                <div className="bg-white border border-slate-200 rounded-2xl h-64 animate-pulse" />
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 7: Skeleton para Alertas**

[apps/web/src/app/platform/alertas/loading.tsx](apps/web/src/app/platform/alertas/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function AlertasLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-64 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-20 bg-slate-200 rounded-2xl mb-6 animate-pulse" />
            <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 8: Skeleton para Ajustes**

[apps/web/src/app/platform/ajustes/loading.tsx](apps/web/src/app/platform/ajustes/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function AjustesLoading() {
    return (
        <PageContainer maxWidth="3xl">
            <div className="mb-8">
                <div className="h-7 w-32 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl h-48 animate-pulse" />
                <div className="bg-white border border-slate-200 rounded-2xl h-32 animate-pulse" />
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 9: Skeleton para Reportes**

[apps/web/src/app/platform/reportes/loading.tsx](apps/web/src/app/platform/reportes/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function ReportesLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-56 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-48 animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 10: Skeleton para Modelo**

[apps/web/src/app/platform/modelo/loading.tsx](apps/web/src/app/platform/modelo/loading.tsx):

```tsx
import { PageContainer } from "@/components/ui/PageContainer";

export default function ModeloLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-72 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="bg-slate-200 rounded-2xl h-32 mb-6 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-56 animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
```

- [ ] **Step 11: Verificar build**

```bash
cd apps/web && npm run build
```

Expected: build green, sin warnings nuevos.

- [ ] **Step 12: Verificar funcional**

> **Acción requerida del usuario:** En modo dev (`npm run dev`), abrir cada ruta de `/platform/*` con el devtools Network throttling activado en "Slow 3G" para forzar mostrar el skeleton:
> - `/platform`
> - `/platform/uploads`
> - `/platform/uploads/<id>` (cualquier id válido)
> - `/platform/upload`
> - `/platform/analyze`
> - `/platform/alertas`
> - `/platform/ajustes`
> - `/platform/reportes`
> - `/platform/modelo`
>
> Cada uno debe mostrar un skeleton específico antes de cargar el contenido real.

También probar un error: en cualquier página, abrir devtools y `throw new Error("test")` desde el server side modificando temporalmente una página. Confirmar que `/platform/error.tsx` renderiza con AlertBanner + botones Reintentar / Ir al Dashboard.

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/app/platform/error.tsx apps/web/src/app/platform/loading.tsx apps/web/src/app/platform/uploads/loading.tsx apps/web/src/app/platform/uploads/[id]/loading.tsx apps/web/src/app/platform/upload/loading.tsx apps/web/src/app/platform/analyze/loading.tsx apps/web/src/app/platform/analyze/[id]/loading.tsx apps/web/src/app/platform/alertas/loading.tsx apps/web/src/app/platform/ajustes/loading.tsx apps/web/src/app/platform/reportes/loading.tsx apps/web/src/app/platform/modelo/loading.tsx
git commit -m "$(cat <<'EOF'
feat: error.tsx global + loading.tsx por ruta en /platform

- error.tsx global en /platform/ que captura todos los errores con AlertBanner
  + botones Reintentar / Ir al Dashboard. Loguea solo el digest no-PII.
- 10 loading.tsx, uno por cada ruta de la plataforma, con skeletons
  especificos al contenido esperado (tabla, cards, form, detail, etc.)

Resuelve el follow-up "loading/error por ruta" del sub-proyecto B.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 4.3: Reportar Checkpoint 4

- [ ] **Step 1: Resumir al usuario**

Reportar:
- `error.tsx` global creado.
- 10 `loading.tsx` creados.
- 1 commit, build verde.

Esperar luz verde antes de avanzar a Sección 5.

---

# Sección 5 — Refactor de `analyze/page.tsx` a Server Component + server action

## Task 5.1: Crear server action `actions.ts`

**Files:**
- Create: `apps/web/src/app/platform/analyze/actions.ts`

- [ ] **Step 1: Crear el archivo de server actions**

Crear [apps/web/src/app/platform/analyze/actions.ts](apps/web/src/app/platform/analyze/actions.ts) con:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type AnalyzeFeatureKey =
    | "subtlety"
    | "calcification"
    | "sphericity"
    | "margin"
    | "lobulation"
    | "spiculation"
    | "texture"
    | "malignancy";

export type AnalyzeState = {
    error?: string;
};

const FEATURE_LIMITS: Record<AnalyzeFeatureKey, { min: number; max: number; label: string }> = {
    subtlety: { min: 1, max: 5, label: "Subtlety" },
    calcification: { min: 1, max: 6, label: "Calcification" },
    sphericity: { min: 1, max: 5, label: "Sphericity" },
    margin: { min: 1, max: 5, label: "Margin" },
    lobulation: { min: 1, max: 5, label: "Lobulation" },
    spiculation: { min: 1, max: 5, label: "Spiculation" },
    texture: { min: 1, max: 5, label: "Texture" },
    malignancy: { min: 1, max: 5, label: "Malignancy" },
};

const FEATURE_KEYS = Object.keys(FEATURE_LIMITS) as AnalyzeFeatureKey[];

const MAX_BYTES = 10 * 1024 * 1024;

export async function analyzeAction(
    _prev: AnalyzeState,
    formData: FormData
): Promise<AnalyzeState> {
    const file = formData.get("imagen");
    if (!(file instanceof File) || file.size === 0) {
        return { error: "Selecciona una imagen PNG o JPG." };
    }
    if (file.size > MAX_BYTES) {
        return { error: "La imagen excede el limite de 10 MB." };
    }

    for (const key of FEATURE_KEYS) {
        const spec = FEATURE_LIMITS[key];
        const raw = formData.get(key);
        const str = typeof raw === "string" ? raw : "";
        const num = Number(str);
        if (str === "" || Number.isNaN(num)) {
            return { error: `Ingresa un numero valido para ${spec.label}.` };
        }
        if (num < spec.min || num > spec.max) {
            return { error: `${spec.label} debe estar entre ${spec.min} y ${spec.max}.` };
        }
    }

    const supabase = await createClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session?.access_token) {
        return { error: "No se pudo obtener la sesion del usuario. Recarga la pagina." };
    }

    const upstream = new FormData();
    upstream.append("imagen", file);
    for (const key of FEATURE_KEYS) {
        upstream.append(key, formData.get(key) as string);
    }

    let uploadId: string | undefined;
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/analysis/predict`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${data.session.access_token}` },
                body: upstream,
            }
        );
        const result = (await response.json()) as { upload_id?: string; detail?: string };
        if (!response.ok) {
            return { error: result.detail || "Error iniciando el analisis." };
        }
        uploadId = result.upload_id;
    } catch {
        return { error: "Ocurrio un error inesperado iniciando el analisis." };
    }

    if (!uploadId) {
        return { error: "El backend no devolvio un ID de analisis." };
    }

    redirect(`/platform/analyze/${uploadId}`);
}
```

> **Nota sobre `redirect()` y server actions:** En Next.js App Router, `redirect()` dentro de un server action lanza una excepción especial (`NEXT_REDIRECT`) que el framework intercepta. NO retornar nada después de `redirect()`. NO envolver `redirect()` en try/catch.

## Task 5.2: Crear Client Component `AnalyzeForm.tsx`

**Files:**
- Create: `apps/web/src/app/platform/analyze/AnalyzeForm.tsx`

- [ ] **Step 1: Crear el formulario con `useActionState`**

Crear [apps/web/src/app/platform/analyze/AnalyzeForm.tsx](apps/web/src/app/platform/analyze/AnalyzeForm.tsx) con:

```tsx
"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { analyzeAction, type AnalyzeFeatureKey, type AnalyzeState } from "./actions";

type FeatureSpec = {
    key: AnalyzeFeatureKey;
    label: string;
    min: number;
    max: number;
    hint: string;
    default: string;
};

const FEATURES: FeatureSpec[] = [
    { key: "subtlety",     label: "Subtlety",      min: 1, max: 5, hint: "1 = muy sutil, 5 = obvio",      default: "3" },
    { key: "calcification",label: "Calcification", min: 1, max: 6, hint: "1 = popcorn, 6 = ausente",     default: "3" },
    { key: "sphericity",   label: "Sphericity",    min: 1, max: 5, hint: "1 = lineal, 5 = redondo",      default: "3" },
    { key: "margin",       label: "Margin",        min: 1, max: 5, hint: "1 = mal definido, 5 = bien",   default: "3" },
    { key: "lobulation",   label: "Lobulation",    min: 1, max: 5, hint: "1 = ninguna, 5 = marcada",     default: "3" },
    { key: "spiculation",  label: "Spiculation",   min: 1, max: 5, hint: "1 = ninguna, 5 = marcada",     default: "3" },
    { key: "texture",      label: "Texture",       min: 1, max: 5, hint: "1 = no solido, 5 = solido",    default: "3" },
    { key: "malignancy",   label: "Malignancy",    min: 1, max: 5, hint: "1 = benigno, 5 = maligno",     default: "3" },
];

const INITIAL_STATE: AnalyzeState = {};

export function AnalyzeForm() {
    const [state, formAction, pending] = useActionState(analyzeAction, INITIAL_STATE);
    const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

    return (
        <form action={formAction} className="space-y-8">
            <div>
                <label htmlFor="analyze-imagen" className="mb-2 block text-sm font-medium text-slate-700">
                    Imagen CT (PNG / JPG, máx 10 MB)
                </label>
                <input
                    id="analyze-imagen"
                    name="imagen"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        setFileInfo(f ? { name: f.name, size: f.size } : null);
                    }}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-all font-medium focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary outline-none"
                />
                {fileInfo && (
                    <p className="text-xs text-slate-500 mt-2">
                        Seleccionado: <span className="font-medium">{fileInfo.name}</span> ({(fileInfo.size / 1024).toFixed(0)} KB)
                    </p>
                )}
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Features clínicas</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map((spec) => (
                        <Input
                            key={spec.key}
                            name={spec.key}
                            label={`${spec.label} (${spec.min}-${spec.max})`}
                            type="number"
                            step="0.1"
                            min={spec.min}
                            max={spec.max}
                            defaultValue={spec.default}
                            placeholder={spec.hint}
                        />
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                    Las features siguen la convención LIDC-IDRI. Valor por defecto 3 = intermedio.
                </p>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={pending}>
                {pending ? "Iniciando análisis..." : "Ejecutar análisis"}
            </Button>

            {state.error && (
                <AlertBanner
                    variant="error"
                    title="No pudimos iniciar el análisis"
                    description={state.error}
                />
            )}
        </form>
    );
}
```

- [ ] **Step 2: Verificar que el `Input` component acepta `name` y `defaultValue`**

Leer [apps/web/src/components/ui/Input.tsx](apps/web/src/components/ui/Input.tsx). Si no propaga `name` y `defaultValue` al elemento `<input>` (debería, si extiende `React.InputHTMLAttributes`), reportar el problema al usuario antes de continuar.

## Task 5.3: Convertir `page.tsx` a Server Component

**Files:**
- Modify: `apps/web/src/app/platform/analyze/page.tsx`

- [ ] **Step 1: Reemplazar el contenido completo**

Reemplazar TODO [apps/web/src/app/platform/analyze/page.tsx](apps/web/src/app/platform/analyze/page.tsx) por:

```tsx
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { AnalyzeForm } from "./AnalyzeForm";

export default function AnalyzePage() {
    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title="Análisis IA de nódulo pulmonar"
                description="Sube una imagen CT (PNG/JPG) e ingresa las 8 features clínicas. El modelo OncaScan AI devolverá score y nivel de riesgo."
                action={
                    <Link
                        href="/platform"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Cancelar y Volver
                    </Link>
                }
            />
            <Card>
                <CardContent className="p-8">
                    <AnalyzeForm />
                </CardContent>
            </Card>
        </PageContainer>
    );
}
```

> **Nota:** Eliminamos `"use client"`. La página es ahora Server Component. Todo el estado vive en `AnalyzeForm` (Client Component) y la lógica de API + redirect vive en `actions.ts` (server-side).

- [ ] **Step 2: Verificar build**

```bash
cd apps/web && npm run build
```

Expected: build green. Si hay errores TypeScript sobre tipos de `useActionState` o `formAction`, revisar versiones de React.

- [ ] **Step 3: Verificar funcional**

> **Acción requerida del usuario:** Abrir [http://localhost:3000/platform/analyze](http://localhost:3000/platform/analyze). Probar:
> - Submit sin imagen → AlertBanner "Selecciona una imagen PNG o JPG."
> - Submit con imagen > 10MB → AlertBanner "La imagen excede el limite de 10 MB."
> - Submit con feature fuera de rango (ej. malignancy = 10) → AlertBanner indicando rango válido.
> - Submit válido → spinner en botón → redirect a `/platform/analyze/<id>`.
> - Verificar en devtools Network que la petición POST a `/api/v1/analysis/predict` se hace desde el SERVER (no aparece como petición fetch desde el cliente). El cliente ve solo la respuesta del server action y el redirect.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/platform/analyze/page.tsx apps/web/src/app/platform/analyze/AnalyzeForm.tsx apps/web/src/app/platform/analyze/actions.ts
git commit -m "$(cat <<'EOF'
refactor: analyze page a Server Component + server action

Cumple la regla de apps/web/CLAUDE.md de usar server actions en vez de
useState para data flow. Estructura:

- page.tsx queda Server Component (sin "use client", sin useState)
- AnalyzeForm.tsx (nuevo) es Client Component con useActionState
- actions.ts (nuevo) tiene analyzeAction server-side: valida, llama
  FastAPI server-side con bearer del session de Supabase, redirect()
  al resultado

La llamada al backend de FastAPI ahora ocurre server-side, no client-side.
El access_token nunca sale al navegador del usuario.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 5.4: Reportar Checkpoint 5

- [ ] **Step 1: Resumir al usuario**

Reportar:
- `analyze/page.tsx` ahora Server Component.
- `actions.ts` server action creado.
- `AnalyzeForm.tsx` Client Component con `useActionState`.
- 1 commit, build verde, funcional verificado.

Esperar luz verde antes de avanzar a Sección 6.

---

# Sección 6 — Rediseño de `uploads/[id]/page.tsx` a light theme

## Task 6.1: Reescribir el detail page con design system

**Files:**
- Modify: `apps/web/src/app/platform/uploads/[id]/page.tsx`

- [ ] **Step 1: Reemplazar el contenido completo**

Reemplazar TODO [apps/web/src/app/platform/uploads/[id]/page.tsx](apps/web/src/app/platform/uploads/[id]/page.tsx) por:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertBanner } from "@/components/ui/AlertBanner";

type PageProps = {
    params: Promise<{ id: string }>;
};

function asRiskLevel(level: string | null | undefined): RiskLevel | null {
    if (level === "ALTO" || level === "MEDIO" || level === "BAJO") return level;
    return null;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value ?? "N/D"}</dd>
        </div>
    );
}

export default async function UploadDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: upload, error } = await supabase
        .from("dicom_uploads")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !upload) notFound();

    const isAnalyzed = upload.upload_status === "analyzed" || upload.upload_status === "ai_completed";
    const hasError = upload.upload_status === "error" || upload.upload_status === "ai_failed";
    const caseRef = upload.metadata_json?.case_ref;

    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title={upload.original_name}
                description="Registro completo del estudio y resultado del análisis IA."
                action={
                    <Link
                        href="/platform/uploads"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        ← Volver al historial
                    </Link>
                }
            />

            {/* Resultado IA */}
            {isAnalyzed && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                            Resultado del análisis IA
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Nivel de riesgo
                                </p>
                                <div className="flex justify-center">
                                    <RiskBadge level={asRiskLevel(upload.ai_risk_level)} />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Score IA
                                </p>
                                <p className="text-3xl font-bold text-slate-800 tabular-nums">
                                    {upload.ai_score != null
                                        ? `${(upload.ai_score * 100).toFixed(1)}%`
                                        : "N/D"}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Modelo
                                </p>
                                <p className="text-sm font-semibold text-brand-primary mt-2">
                                    {upload.ai_model_version ?? "N/D"}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Recomendación clínica
                            </p>
                            <p className="text-slate-800 font-medium">{upload.ai_recommendation ?? "N/D"}</p>
                        </div>

                        {upload.ai_processed_at && (
                            <p className="text-xs text-slate-500">
                                Analizado el {new Date(upload.ai_processed_at).toLocaleString()}
                            </p>
                        )}

                        <p className="text-xs text-slate-400 mt-2">
                            Resultado de apoyo diagnóstico — no reemplaza el criterio del especialista.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Error de análisis */}
            {hasError && upload.ai_error && (
                <AlertBanner
                    variant="error"
                    title="Error en el análisis IA"
                    description={upload.ai_error}
                    className="mb-6"
                />
            )}

            {/* Sin análisis */}
            {!isAnalyzed && !hasError && (
                <Card className="mb-6">
                    <CardContent className="p-8 text-center">
                        <p className="text-slate-600 text-sm mb-4">Este archivo aún no ha sido analizado con IA.</p>
                        <Link
                            href="/platform/upload"
                            className={buttonVariants({ variant: "primary", size: "md" })}
                        >
                            Ir a subir y analizar
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Info del archivo */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                        Información del archivo
                    </h2>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InfoItem
                            label="ID"
                            value={<span className="font-mono text-xs text-slate-600">{upload.id}</span>}
                        />
                        <InfoItem
                            label="Estado"
                            value={<StatusBadge status={upload.upload_status} />}
                        />
                        <InfoItem
                            label="Referencia del caso"
                            value={
                                caseRef
                                    ? <span className="inline-block bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-md text-xs font-medium">{String(caseRef)}</span>
                                    : <span className="text-slate-400 text-xs italic">Sin referencia asignada</span>
                            }
                        />
                        <InfoItem label="Archivo" value={upload.original_name} />
                        <InfoItem
                            label="Tamaño"
                            value={upload.file_size ? `${(upload.file_size / 1024).toFixed(1)} KB` : null}
                        />
                        <InfoItem label="Modalidad" value={upload.modality} />
                        <InfoItem label="Fecha estudio" value={upload.study_date} />
                        <InfoItem label="Patient ID" value={upload.patient_id_dicom} />
                        <InfoItem
                            label="Creado"
                            value={new Date(upload.created_at).toLocaleString()}
                        />
                        <InfoItem
                            label="Ruta storage"
                            value={<span className="font-mono text-xs text-slate-500 break-all">{upload.storage_path}</span>}
                        />
                    </dl>
                </CardContent>
            </Card>

            {/* Features clínicas */}
            {upload.clinical_features && (
                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                            Parámetros radiológicos ingresados
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(upload.clinical_features).map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                    <p className="text-xs text-slate-500 capitalize mb-1">{key}</p>
                                    <p className="text-xl font-bold text-slate-800">{String(value)}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </PageContainer>
    );
}
```

Cambios respecto al original:
- Eliminado `<main className="min-h-screen bg-slate-950 ... text-white">`. La página ahora se renderiza dentro del layout normal `/platform/`.
- Light theme completo: bg blanco, texto slate, paleta tokens.
- Usa `RiskBadge`, `StatusBadge`, `AlertBanner`, `buttonVariants` del design system.
- Integra el campo `case_ref` desde `metadata_json` (idea de Nicolás, limpia, sin los comentarios `// DESPUÉS`).
- `dl/dt/dd` semánticos en la info del archivo.
- Maneja `upload_status` de ambos sets: `"analyzed"` / `"ai_completed"` y `"error"` / `"ai_failed"`.

- [ ] **Step 2: Verificar que `StatusBadge` acepta los valores reales**

Leer [apps/web/src/components/ui/StatusBadge.tsx](apps/web/src/components/ui/StatusBadge.tsx) y confirmar que reconoce `"analyzed"`, `"ai_completed"`, `"ai_failed"`, `"processing"`, `"uploaded"`, `"error"`. Si no, reportar al usuario antes de continuar — pero el sub-proyecto B ya lo arregló según el Jira.

- [ ] **Step 3: Verificar build y visual**

```bash
cd apps/web && npm run build
```

> **Acción requerida del usuario:** Abrir cualquier upload existente vía [http://localhost:3000/platform/uploads](http://localhost:3000/platform/uploads) → click en una fila. Verificar:
> - Light theme completo (sin bg-slate-950).
> - `RiskBadge` reemplaza el bloque de risk.
> - `StatusBadge` aparece en el bloque de info.
> - Si existe `case_ref`, aparece como badge brand-primary; si no, aparece "Sin referencia asignada".
> - Si el upload tiene error, `AlertBanner variant="error"` aparece arriba.
> - Si no fue analizado, aparece la card con CTA "Ir a subir y analizar".

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/platform/uploads/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat: redisenar uploads/[id] de dark theme a light theme + design system

Reescritura completa de la pagina de detalle:
- bg-slate-950 dark theme reemplazado por light theme consistente con
  el resto de la plataforma
- Usa PageContainer, SectionHeader, Card, RiskBadge, StatusBadge,
  AlertBanner, buttonVariants compartidos
- Integra el campo case_ref desde metadata_json (idea de fronted-nicolas,
  pero sin los comentarios // DESPUES que quedaron rotos en el JSX)
- Semantica dl/dt/dd en la info del archivo
- Maneja upload_status legacy ("analyzed", "error") y nuevo ("ai_completed", "ai_failed")

Resuelve los follow-ups del sub-proyecto B:
- "uploads/[id] dark theme" -> light theme con design system
- "case_ref display" -> integrado como InfoItem destacado

Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 6.2: Reportar Checkpoint 6

- [ ] **Step 1: Resumir al usuario**

Reportar:
- `uploads/[id]/page.tsx` rediseñado a light theme con design system.
- `case_ref` integrado.
- 1 commit, build verde, visual verificado.

Esperar luz verde antes de avanzar a Sección 7.

---

# Sección 7 — Landing `app/page.tsx` adopta tokens platform + a11y sweep + cierre

## Task 7.1: Reescribir la landing con tokens platform

**Files:**
- Modify: `apps/web/src/app/page.tsx`

> **Cambio visual fuerte:** La paleta marketing (navy `#020B2D` + cyan `#22AFFF`) se reemplaza por la paleta clínica (Deep Space Blue `#012641` + Raspberry Red `#EE005A`). La landing pasa de "tech startup" a "clínica seria con acento rojo". El usuario aprobó este cambio.

- [ ] **Step 1: Reemplazar el contenido completo**

Reemplazar TODO [apps/web/src/app/page.tsx](apps/web/src/app/page.tsx) por:

```tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Upload, Users, Activity, FileText, ShieldCheck, Stethoscope,
  ArrowRight, CheckCircle2, Server, Database, Layout, Globe,
  BriefcaseMedical, Code
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-primary text-white selection:bg-brand-danger/30 font-sans">

      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-brand-primary/90 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image
            src="/images/brand/logo-oncascan.png"
            alt="OncaScan Logo"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
          <a href="#about" className="hover:text-brand-danger transition">Acerca de</a>
          <a href="#features" className="hover:text-brand-danger transition">Características</a>
          <a href="#architecture" className="hover:text-brand-danger transition">Tecnología</a>
          <a href="#roadmap" className="hover:text-brand-danger transition">Roadmap</a>
        </div>
        <div>
          <Link href="/login" className="px-5 py-2.5 bg-brand-danger hover:bg-brand-danger-hover text-white text-sm font-bold rounded-lg transition shadow-[0_0_15px_rgba(238,0,90,0.35)]">
            Ingresar
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <header className="relative px-6 py-24 md:py-32 overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-danger/20 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />

        <div className="mb-6 inline-flex rounded-full border border-brand-danger/30 bg-brand-danger/10 px-4 py-1.5 text-sm text-brand-danger shadow-[0_0_10px_rgba(238,0,90,0.2)]">
          <BriefcaseMedical className="w-4 h-4 mr-2" aria-hidden="true" />
          Prototipo de Investigación Académica
        </div>

        <h1 className="max-w-5xl text-5xl md:text-7xl font-bold tracking-tight mb-6 mt-4">
          Inteligencia Artificial para la <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-danger to-rose-300">Detección Temprana</span>
        </h1>

        <p className="max-w-3xl text-lg md:text-xl text-slate-300 mb-4 leading-relaxed">
          Plataforma de análisis de imágenes médicas enfocada en priorizar el riesgo oncológico de pulmón para entornos con recursos clínicos limitados.
        </p>

        <p className="max-w-2xl text-xs md:text-sm text-slate-400 mb-10 px-4 py-3 bg-white/5 rounded-lg border border-white/10">
          <strong>Aviso Clínico:</strong> Esta solución es una herramienta de apoyo investigativo y no reemplaza el juicio clínico del especialista oncológico o neumólogo.
        </p>

        <div className="flex gap-4 relative z-10 mb-20">
          <Link href="/login" className="flex items-center px-6 py-3 bg-brand-danger hover:bg-brand-danger-hover text-white font-semibold rounded-lg transition shadow-[0_0_20px_rgba(238,0,90,0.4)]">
            Acceder a la Plataforma <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
          </Link>
          <a href="#about" className="flex items-center px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition border border-white/10">
            Conoce más
          </a>
        </div>

        <div className="w-full max-w-6xl relative z-10">
          <div className="rounded-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transform hover:scale-[1.01] transition duration-500">
            <Image
              src="/images/project/hero-dashboard.png"
              alt="OncaScan Dashboard"
              width={1200}
              height={800}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </header>

      {/* 3. About */}
      <section id="about" className="px-6 py-24 bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">El Problema de la Detección Tardía</h2>
            <p className="text-slate-300 text-lg mb-4">
              En Latinoamérica, el cáncer de pulmón se diagnostica frecuentemente en etapas avanzadas, reduciendo drásticamente las tasas de supervivencia. La escasez de especialistas y recursos para lectura oportuna de tomografías agrava esta situación.
            </p>
            <p className="text-slate-300 text-lg mb-6">
              Nuestra propuesta de valor radica en un sistema de pre-evaluación algorítmica que clasifica y prioriza estudios (DICOM) para que los radiólogos y neumólogos enfoquen su atención donde más se necesita, optimizando tiempo y salvando vidas.
            </p>
            <ul className="space-y-3">
              {[
                "Optimización del tiempo especialista",
                "Interfaz diseñada para contextos clínicos reales",
                "Integración estándar con archivos DICOM",
              ].map((item, i) => (
                <li key={i} className="flex items-center text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-brand-danger mr-3" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-1/2 relative">
            <div className="aspect-square bg-gradient-to-tr from-brand-danger/20 to-brand-primary-hover/40 rounded-full blur-3xl absolute inset-0" aria-hidden="true"></div>
            <div className="relative border border-white/10 bg-brand-primary/90 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="flex gap-4 items-center mb-6 border-b border-white/10 pb-6">
                <div className="p-3 bg-brand-danger/20 text-brand-danger rounded-lg"><Activity className="w-6 h-6" aria-hidden="true" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Priorización de Riesgo Alto</h3>
                  <p className="text-sm text-slate-400">Reduce tiempos de espera del paciente</p>
                </div>
              </div>
              <div className="flex gap-4 items-center mb-6 border-b border-white/10 pb-6">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg"><ShieldCheck className="w-6 h-6" aria-hidden="true" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Ambiente Seguro</h3>
                  <p className="text-sm text-slate-400">Datos encriptados (Supabase RLS)</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg"><Stethoscope className="w-6 h-6" aria-hidden="true" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Asistente, no reemplazo</h3>
                  <p className="text-sm text-slate-400">Diseñado con &ldquo;Second-Reader Paradigm&rdquo;</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="px-6 py-24 bg-brand-primary relative border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Módulos del Sistema</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Componentes construidos para garantizar eficiencia operativa y seguridad clínica.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <Upload className="w-6 h-6" aria-hidden="true" />, title: "Carga DICOM Segura", desc: "Subida robusta de tomografías de tórax en formato estándar." },
            { icon: <Users className="w-6 h-6" aria-hidden="true" />, title: "Gestión de Pacientes", desc: "Perfiles anónimos para proteger la PHI según normativas." },
            { icon: <Activity className="w-6 h-6" aria-hidden="true" />, title: "Análisis con IA (Próx.)", desc: "Inferencia automática usando redes neuronales profundas." },
            { icon: <FileText className="w-6 h-6" aria-hidden="true" />, title: "Historial Clínico", desc: "Trazabilidad completa de estudios y reportes subidos." },
            { icon: <ShieldCheck className="w-6 h-6" aria-hidden="true" />, title: "Autenticación JWT", desc: "Acceso protegido exclusivo para investigadores autorizados." },
            { icon: <Stethoscope className="w-6 h-6" aria-hidden="true" />, title: "Interfaz Médica", desc: "UI orientada a radiología, reduciendo la fatiga visual." },
          ].map((feature, i) => (
            <Card key={i} className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-brand-danger/50 transition duration-300">
              <CardContent className="p-6 flex flex-col items-start gap-4">
                <div className="p-3 bg-brand-danger/10 text-brand-danger rounded-xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-100">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. Architecture */}
      <section id="architecture" className="px-6 py-24 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Arquitectura Moderna</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Stack tecnológico de punta que asegura escalabilidad, velocidad y fiabilidad en tiempo real.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Layout className="w-10 h-10" aria-hidden="true" />, title: "Next.js 14", sub: "Frontend (React)" },
            { icon: <Server className="w-10 h-10" aria-hidden="true" />, title: "FastAPI", sub: "Backend Python" },
            { icon: <Database className="w-10 h-10" aria-hidden="true" />, title: "Supabase", sub: "Auth & DB" },
            { icon: <Activity className="w-10 h-10" aria-hidden="true" />, title: "PyTorch", sub: "DL Framework" },
          ].map((tech, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-brand-danger/40 transition text-center group">
              <div className="text-slate-400 group-hover:text-brand-danger transition mb-3">
                {tech.icon}
              </div>
              <h4 className="font-semibold text-lg">{tech.title}</h4>
              <p className="text-xs text-slate-400">{tech.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Research */}
      <section className="px-6 py-24 bg-brand-primary border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center border p-12 rounded-3xl border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-6">
            <Globe className="text-brand-danger w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Contexto de Investigación Estudiantil</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-6">
            Este prototipo se ha desarrollado dentro de un ambiente académico controlado como parte de un proyecto universitario. Todas las pruebas se realizan con datasets oncológicos públicos y anonimizados (ej. LIDC-IDRI).
          </p>
          <div className="inline-block px-4 py-2 bg-brand-danger/10 text-brand-danger rounded-lg text-sm border border-brand-danger/30">
            Fase de Desarrollo Universitario
          </div>
        </div>
      </section>

      {/* 7. Team */}
      <section className="px-6 py-24 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Equipo Desarrollador</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Investigadores y desarrolladores detrás de OncaScan.
          </p>
        </div>

        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
          {[
            { name: "Juan Esteban Aldana", role: "Backend Developer" },
            { name: "Nicolás Chávez Oliveros", role: "Tech Lead & Data Engineer" },
            { name: "Juan Pablo Sotelo Mejía", role: "Frontend & UI/UX" },
            { name: "Luis De Ávila Mosquera.", role: "AI Engineer & QA" },
            { name: "Juan Mateo Salas Arturo", role: "Project manager & DevOps" },
          ].map((member, i) => (
            <div key={i} className="flex flex-col items-center group">
              <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 overflow-hidden flex items-center justify-center group-hover:border-brand-danger transition">
                <Users className="w-8 h-8 text-slate-500 group-hover:text-brand-danger" aria-hidden="true" />
              </div>
              <h4 className="font-semibold text-slate-100">{member.name}</h4>
              <p className="text-xs text-brand-danger">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Open Source / GitHub */}
      <section className="px-6 py-24 bg-brand-primary border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-800/50 blur-[100px] rounded-full" aria-hidden="true"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Code className="w-16 h-16 mx-auto mb-6 text-slate-300" aria-hidden="true" />
          <h2 className="text-3xl font-bold mb-4">Iniciativa Open Source</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Creemos que la tecnología médica debe ser transparente y auditable. El código base de la plataforma OncaScan estará disponible en el repositorio de la organización.
          </p>
          <a href="https://github.com/ProyectoBenditos/Benditos_cancer_detector" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-white text-brand-primary font-medium rounded-lg hover:bg-slate-200 transition">
            Ver Repositorio <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* 9. Roadmap */}
      <section id="roadmap" className="px-6 py-24 bg-slate-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Hoja de Ruta del Proyecto</h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {[
            { phase: "Fase 1", title: "MVP Funcional (Actual)", status: "Completado", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
            { phase: "Fase 2", title: "Integración de Modelos de Predicción", status: "En Proceso", color: "text-brand-danger bg-brand-danger/10 border-brand-danger/20" },
            { phase: "Fase 3", title: "Visor DICOM Interactivo Base", status: "Planificado", color: "text-slate-400 bg-slate-800/50 border-white/10" },
            { phase: "Fase 4", title: "Entrenamiento de modelo", status: "Futuro", color: "text-slate-400 bg-slate-800/50 border-white/10" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="mb-4 md:mb-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">{item.phase}</span>
                <h4 className="text-lg font-semibold">{item.title}</h4>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-medium border ${item.color} w-fit`}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="px-6 py-12 bg-black border-t border-white/10 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <Image src="/images/brand/logo-oncascan.png" alt="Logo" width={100} height={26} className="h-6 w-auto mb-4 opacity-70 grayscale hover:grayscale-0 transition" />
            <p className="text-xs text-slate-500 max-w-sm">
              Sistema de pre-evaluación algorítmica para riesgo oncológico. Proyecto universitario controlado.
            </p>
          </div>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-white transition">Privacidad</a>
            <a href="#" className="hover:text-white transition">Términos</a>
            <a href="https://github.com/ProyectoBenditos" className="hover:text-white transition">GitHub</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-white/5 text-xs text-slate-600 text-center">
          © {new Date().getFullYear()} OncaScan by ProyectoBenditos. Todos los derechos reservados.
        </div>
      </footer>

    </div>
  );
}
```

Mapeo aplicado:

| Antes | Después |
|-------|--------|
| `bg-[#020B2D]` | `bg-brand-primary` |
| `bg-[#010619]` | `bg-slate-950` |
| `bg-[#00030d]` | `bg-black` (footer) |
| `text-[#22AFFF]` | `text-brand-danger` |
| `bg-[#22AFFF]` | `bg-brand-danger` (CTAs) |
| `hover:bg-[#1a8ce6]` | `hover:bg-brand-danger-hover` |
| `bg-[#22AFFF]/20` | `bg-brand-danger/20` |
| `border-[#22AFFF]/30` | `border-brand-danger/30` |
| `text-[#020B2D]` | `text-white` (en botones) o `text-brand-primary` (en repo button) |
| Gradient `from-[#22AFFF] to-cyan-300` | `from-brand-danger to-rose-300` |
| `shadow-[0_0_15px_rgba(34,175,255,0.4)]` | `shadow-[0_0_15px_rgba(238,0,90,0.35)]` |
| Roadmap "En Proceso" tag color | `text-brand-danger bg-brand-danger/10 ...` |
| Iconos `aria-hidden="true"` | Agregados en TODOS los iconos decorativos |
| `bg-blue-900/30 text-blue-300 border-blue-800` (Research badge) | `bg-brand-danger/10 text-brand-danger border-brand-danger/30` |

- [ ] **Step 2: Verificar build**

```bash
cd apps/web && npm run build
```

- [ ] **Step 3: Verificar greps de limpieza**

```bash
grep -n "bg-\[#\|text-\[#\|hover:bg-\[#\|border-\[#" apps/web/src/app/page.tsx
```

Expected: 0 hits.

```bash
grep -n "020B2D\|010619\|22AFFF\|1a8ce6\|#00030d" apps/web/src/app/page.tsx
```

Expected: 0 hits (los rgba en shadow son OK porque usan números, no hex).

- [ ] **Step 4: Verificar visual**

> **Acción requerida del usuario:** Abrir [http://localhost:3000/](http://localhost:3000/). Verificar:
> - Fondo navy (Deep Space Blue) en vez del navy más oscuro original.
> - Botones e iconos en raspberry red en vez de cyan.
> - Glow del hero ahora es rosa rojizo en vez de cyan.
> - Gradient del título principal: de raspberry a rose-300.
> - Cards de Features tienen border raspberry on hover.
> - Footer es negro.
> - **Importante:** revisar contraste de texto secundario sobre fondos brand-primary. Si hay textos `text-slate-400` ilegibles, ajustar a `text-slate-300` en ese commit o como follow-up.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "$(cat <<'EOF'
feat: landing publica adopta tokens platform (Deep Space Blue + Raspberry)

Reemplaza la paleta marketing (navy #020B2D + cyan #22AFFF) por la paleta
clinica de la plataforma. Cambios:
- Todos los bg-[#...] hardcoded eliminados (~17 instancias)
- Todos los text-[#...]/hover-[#...] eliminados
- Cyan (#22AFFF) como accent reemplazado por Raspberry Red (brand-danger)
- Gradient del titulo: from-brand-danger to-rose-300
- Glow del hero: brand-danger/20
- aria-hidden agregado a TODOS los iconos decorativos
- Footer pasa a bg-black

Cambio visual fuerte: la landing pierde el look "tech startup" y gana
un look "clinica con acento rojo". Aprobado por el usuario.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Task 7.2: A11y sweep — preparación y contingencia

**Files:** ninguno (acción del usuario)

- [ ] **Step 1: Generar la lista de archivos a auditar**

Generar una lista de los archivos que cambiaron en sub-proyecto C para que el usuario los pase a `/oncoscan-a11y`:

```
apps/web/src/app/page.tsx
apps/web/src/app/platform/page.tsx
apps/web/src/app/platform/ajustes/page.tsx
apps/web/src/app/platform/modelo/page.tsx
apps/web/src/app/platform/reportes/page.tsx
apps/web/src/app/platform/uploads/[id]/page.tsx
apps/web/src/app/platform/analyze/page.tsx
apps/web/src/app/platform/analyze/AnalyzeForm.tsx
apps/web/src/app/platform/error.tsx
apps/web/src/components/layout/Header.tsx
apps/web/src/components/layout/Sidebar.tsx
apps/web/src/app/platform/logout-button.tsx
```

> **Acción requerida del usuario:** Ejecutar `/oncoscan-a11y` sobre cada uno de estos archivos (o sobre `apps/web/src/app/platform/` como ruta global). Reportar findings al ejecutor.

- [ ] **Step 2: Contingencia A — contraste de `brand-danger`**

Si `/oncoscan-a11y` reporta que `brand-danger` (#EE005A) sobre fondo blanco no pasa WCAG AA para texto pequeño (contraste insuficiente, debería ser ≥ 4.5:1), aplicar este cambio:

Editar [apps/web/src/app/globals.css](apps/web/src/app/globals.css) y reemplazar:

```css
  --color-brand-danger: #EE005A;
```

Por:

```css
  --color-brand-danger: #D4004F;
```

> **Razón:** `#D4004F` da contraste ~4.6:1 sobre blanco, suficiente para WCAG AA. La propagación es automática vía el token — ningún archivo de página necesita cambios.

Verificar visual:

```bash
cd apps/web && npm run build
```

> **Acción requerida del usuario:** verificar que el cambio de hex no rompe ningún componente visual.

Commit (solo si se aplicó el cambio):

```bash
git add apps/web/src/app/globals.css
git commit -m "$(cat <<'EOF'
fix: ajustar brand-danger a #D4004F para cumplir contraste WCAG AA

Cambio aplicado tras finding de /oncoscan-a11y: #EE005A tenia ~4.1:1
sobre blanco para texto pequeno (insuficiente para WCAG AA).

#D4004F tiene ~4.6:1, suficiente para textos hasta 14px. La propagacion
es automatica via el token --color-brand-danger; ningun archivo de pagina
necesito cambios.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Otros findings**

Cualquier otro finding de `/oncoscan-a11y` (alt texts, ARIA, focus rings, contraste de otros colores) que NO sea el de brand-danger:

- Si es trivial (1-2 líneas): aplicarlo en el mismo commit con mensaje `fix: a11y findings menores (alt text + aria-label)`.
- Si es estructural (cambio de jerarquía, refactor mayor): documentarlo en `docs/jira/sub-proyecto-c-follow-ups.md` como follow-up para sub-proyecto D.

## Task 7.3: Verificación final de criterios

**Files:** ninguno (greps de verificación)

- [ ] **Step 1: Ejecutar greps de limpieza en la plataforma**

```bash
grep -rn "rose-" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login
```

Expected: 0 hits.

```bash
grep -rn "red-[0-9]" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login
```

Expected: 0 hits.

```bash
grep -rn "bg-\[#" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login
```

Expected: 0 hits.

- [ ] **Step 2: Ejecutar greps de limpieza en la landing**

```bash
grep -n "bg-\[#\|text-\[#\|hover:bg-\[#\|border-\[#" apps/web/src/app/page.tsx
grep -n "020B2D\|010619\|22AFFF\|1a8ce6" apps/web/src/app/page.tsx
```

Expected: 0 hits.

- [ ] **Step 3: Build y lint final**

```bash
cd apps/web && npm run build && npm run lint
```

Expected: ambos verdes.

- [ ] **Step 4: Si algo falla**

- Si build falla: leer el error y arreglar antes de continuar.
- Si grep encuentra hits: revisar archivo por archivo, decidir si reskinear o documentar como follow-up.
- Si lint encuentra errores nuevos (no preexistentes): arreglar.

## Task 7.4: Crear Jira entry del sub-proyecto C

**Files:**
- Create: `docs/jira/sub-proyecto-c-follow-ups.md`

- [ ] **Step 1: Escribir el Jira entry**

Crear [docs/jira/sub-proyecto-c-follow-ups.md](../jira/sub-proyecto-c-follow-ups.md) con un esquema similar a `sub-proyecto-b-design-system.md`. Plantilla:

```markdown
# [ONCO-C] Sub-proyecto C — Cierre de follow-ups + merge fronted-nicolas

**Tipo:** Story
**Estado:** Done
**Sprint / Fase:** Sub-proyecto C
**Fecha de cierre:** 2026-05-20
**Labels:** `design-system`, `accessibility`, `merge`, `server-actions`, `error-boundaries`
**Depende de:** [ONCO-B] Sub-proyecto B
**Habilita:** [ONCO-D] Sub-proyecto D

---

## Summary

Cerrar los follow-ups del sub-proyecto B y simultaneamente incorporar el trabajo paralelo de `fronted-nicolas` (3 paginas nuevas: Modelo, Reportes, Reportes/download + mejoras a uploads). Estrategia: merge conceptual sobre main (sin `git merge` literal). Resultado: 10 archivos nuevos, 8 archivos modificados, ~15 commits, design system intacto.

## Trabajo entregado

### Section 0 — Merge conceptual de fronted-nicolas
- Adoptados: `modelo/page.tsx` (reskineado al design system, con disclaimer de contenido pendiente de validacion clinica)
- Adoptados: `reportes/page.tsx` (reescritura completa, sin slate-900/sky-400)
- Adoptados: `reportes/download/route.ts` (cambiado redirect a 401)
- Dashboard rediseñado adoptando estructura de Nicolas + design system
- Header sin campana de notificaciones
- Sidebar con links a Modelo IA y Reportes (deja de ser Phantom)
- Uploads con busqueda por nombre y referencia (con fix de filter injection)
- Uploads/[id] con campo case_ref integrado

### Section 1 — Pagina /platform/ajustes
- Nueva pagina con perfil + boton cerrar sesion + bloque preferencias
- LogoutButton migrado al design system (Button variant=secondary size=sm)
- LogoutButton movido del Header a la pagina Ajustes
- Sidebar Phantom "Ajustes" activado como Link real

### Section 2 — error.tsx + loading.tsx
- 1 error.tsx global en /platform con AlertBanner + botones retry
- 10 loading.tsx con skeletons especificos por ruta

### Section 3 — analyze refactor a Server Component
- page.tsx Server Component limpio
- AnalyzeForm.tsx Client Component con useActionState
- actions.ts server action que llama FastAPI server-side
- Bearer token nunca sale al cliente

### Section 4 — uploads/[id] redesign a light theme
- Eliminado bg-slate-950 dark theme
- Usa RiskBadge, StatusBadge, AlertBanner del design system
- case_ref integrado como InfoItem destacado
- Maneja status legacy (analyzed/error) y nuevo (ai_completed/ai_failed)

### Section 5 — Landing app/page.tsx adopta tokens platform
- 17 instancias de bg-[#...] eliminadas
- Cyan #22AFFF reemplazado por Raspberry Red (brand-danger)
- aria-hidden en todos los iconos decorativos
- Cambio visual fuerte (aprobado)

### Section 6 — A11y sweep + contingencias aplicadas
- `/oncoscan-a11y` ejecutado por el usuario sobre los archivos modificados
- Findings aplicados: [listar aqui los que se hayan aplicado]
- brand-danger ajustado a #D4004F: [SI/NO segun resultado del audit]

## Criterios de aceptación

- [x] `cd apps/web && npm run build` pasa.
- [x] `cd apps/web && npm run lint` pasa.
- [x] `grep -rn "rose-" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login` → 0 hits.
- [x] `grep -rn "red-[0-9]" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login` → 0 hits.
- [x] `grep -rn "bg-\[#" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login` → 0 hits.
- [x] `grep -n "bg-\[#" apps/web/src/app/page.tsx` → 0 hits.
- [x] Cada ruta de /platform/* tiene loading.tsx.
- [x] /platform/ tiene error.tsx global.
- [x] /platform/analyze es Server Component sin useState.

## Pendientes para Sub-proyecto D

- Validar contenido de `modelo/page.tsx` con Luis (AI Engineer): el contenido habla de ISIC/EfficientNet pero el dataset real es LIDC-IDRI con CT toracico.
- Migrar `NEXT_PUBLIC_API_URL` a env server-only (`API_URL`).
- Implementacion real de "Pacientes Registrados" (requiere schema).
- Implementacion de "Preferencias" en /platform/ajustes (tema, idioma, notificaciones).
- Tests automatizados.
- Verificar y endurecer RLS de dicom_uploads (afecta export CSV).
- Posibles findings de a11y aplazados.

## Commits

[Listar aqui los commits del sub-proyecto C, generables con: git log --oneline main..HEAD]

## Archivos modificados (X) y creados (Y)

[Listar aqui los archivos cambiados, generable con: git diff --stat main..HEAD]

## Co-authorship

Commits que adoptan trabajo de fronted-nicolas (Nicolas Chavez Oliveros / craxker07):
- modelo/page.tsx (Section 0.2)
- reportes/page.tsx (Section 0.3)
- reportes/download/route.ts (Section 0.4)
- platform/page.tsx dashboard (Task 1.1)
- Header.tsx eliminacion campana (Task 1.2)
- Sidebar.tsx links Modelo + Reportes (Task 1.3)
- uploads/page.tsx busqueda (Task 2.1)
- uploads/[id]/page.tsx case_ref (Task 6.1)
```

- [ ] **Step 2: Rellenar las secciones [Listar aqui...]**

Ejecutar y pegar la salida:

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

Y completar el Jira con esos datos antes del commit.

- [ ] **Step 3: Commit del Jira**

```bash
git add docs/jira/sub-proyecto-c-follow-ups.md
git commit -m "docs: registrar Jira entry del sub-proyecto C"
```

## Task 7.5: Reportar Checkpoint 7 (FINAL)

- [ ] **Step 1: Resumir al usuario**

Reportar:
- Landing reskineada con tokens platform (cambio visual fuerte aplicado).
- A11y sweep solicitado al usuario; contingencia aplicada según resultado.
- Jira `docs/jira/sub-proyecto-c-follow-ups.md` creado.
- Greps de verificación: todos verdes.
- Build y lint verdes.
- Total commits del sub-proyecto: `git log --oneline main..HEAD | wc -l`.

- [ ] **Step 2: Preguntar al usuario por la integración a `main`**

> **Pregunta al usuario:** ¿Cómo prefieres integrar la rama `merge/fronted-nicolas-into-main` a `main`?
>
> 1. **Fast-forward local + push**: `git checkout main && git merge --ff-only merge/fronted-nicolas-into-main && git push origin main`
> 2. **PR en GitHub**: push de la rama, crear PR, mergear desde la UI.
> 3. **Esperar** — no integrar todavía, dejar la rama disponible para review.

NO ejecutar la integración sin aprobación explícita del usuario.

---

# Self-review (post-redacción)

Antes de entregar el plan, repasar:

1. **Cobertura de spec:** Todos los items de la sección "Alcance final" del spec están cubiertos en alguna tarea. ✅
2. **Sin placeholders:** Buscar "TODO", "TBD", "implement later" en el plan. → 0 hits esperados.
3. **Type consistency:** `RiskLevel` se importa de `RiskBadge` en dashboard y en uploads/[id]; `AnalyzeFeatureKey` se exporta desde `actions.ts` y se importa en `AnalyzeForm.tsx`. ✅
4. **PHI safety:** Ningún `console.log` con email/path/result_json. El único `console.error` está en `error.tsx` y solo loguea `digest`. ✅
5. **Rutas case-sensitive:** Las páginas nuevas usan minúscula (`modelo/`, `reportes/`) aunque Nicolás haya usado mayúscula en `fronted-nicolas`. ✅
6. **Co-authorship:** Los commits que adoptan trabajo de Nicolás incluyen el trailer. ✅
7. **Verificación funcional:** Cada checkpoint pide al usuario una verificación visual antes de avanzar. ✅

---

## Issues cubiertos

- **KAN-42** — Columnas de riesgo/score en historial DICOM.
- **KAN-43** — Vista de detalle del resultado IA.
- **KAN-45** — Sistema de diseño fundacional (follow-ups + merge `fronted-nicolas`).

Trazabilidad complementaria en [`docs/psp/traceability-matrix.md`](../../psp/traceability-matrix.md).
