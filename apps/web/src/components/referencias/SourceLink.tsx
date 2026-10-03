import React from "react";
import { ExternalLink } from "lucide-react";

type SourceLinkProps = {
    href: string;
    children: React.ReactNode;
    /** `onDark` para fondos brand-primary. */
    tone?: "default" | "onDark";
    className?: string;
};

const TONES = {
    default: "text-brand-primary hover:text-brand-primary-hover focus-visible:ring-brand-primary",
    onDark: "text-white hover:text-white/80 focus-visible:ring-white",
} as const;

/** Enlace a una fuente externa (norma, guía, dataset, paper). Abre en pestaña nueva. */
export function SourceLink({ href, children, tone = "default", className = "" }: SourceLinkProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline underline underline-offset-2 decoration-1 font-medium rounded focus:outline-none focus-visible:ring-2 ${TONES[tone]} ${className}`}
        >
            {children}
            <ExternalLink className="inline w-3 h-3 ml-0.5 -mt-0.5 align-middle" aria-hidden="true" />
            <span className="sr-only"> (abre en una pestaña nueva)</span>
        </a>
    );
}
