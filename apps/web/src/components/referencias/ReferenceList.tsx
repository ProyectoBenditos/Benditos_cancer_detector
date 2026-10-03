import { REFERENCES, REFERENCE_GROUPS, type Reference } from "@/lib/references";
import { SourceLink } from "./SourceLink";

/** Lista completa de fuentes agrupada por tipo, con cita y enlace. */
export function ReferenceList() {
    const all = Object.values(REFERENCES) as Reference[];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REFERENCE_GROUPS.map((group) => (
                <section key={group.id} aria-labelledby={`ref-${group.id}`}>
                    <h3 id={`ref-${group.id}`} className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        {group.title}
                    </h3>
                    <ul className="space-y-3">
                        {all
                            .filter((r) => r.group === group.id)
                            .map((r) => (
                                <li key={r.url} className="text-sm text-slate-600">
                                    <SourceLink href={r.url}>{r.short}</SourceLink>
                                    <p className="text-xs text-slate-500 mt-0.5">{r.citation}</p>
                                    {r.note && <p className="text-xs text-slate-500 mt-0.5 italic">{r.note}</p>}
                                </li>
                            ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
