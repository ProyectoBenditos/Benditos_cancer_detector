import React from "react";
import { AlertTriangle, AlertCircle, Info, XCircle, CheckCircle } from "lucide-react";

export type AlertVariant = "critical" | "warning" | "info" | "error" | "success";

export interface AlertBannerProps {
  variant: AlertVariant;
  title: string;
  description?: string;
  className?: string;
}

type VariantConfig = {
  container: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  role: "alert" | "status";
  ariaLive?: "assertive" | "polite";
  ariaAtomic?: boolean;
};

const VARIANTS: Record<AlertVariant, VariantConfig> = {
  critical: {
    container: "bg-brand-danger/5 border-brand-danger border-2",
    title: "text-brand-danger font-bold",
    description: "text-brand-primary",
    icon: AlertTriangle,
    iconColor: "text-brand-danger",
    role: "alert",
    ariaLive: "assertive",
    ariaAtomic: true,
  },
  warning: {
    container: "bg-amber-50 border-amber-500 border-2",
    title: "text-amber-900 font-bold",
    description: "text-amber-900",
    icon: AlertCircle,
    iconColor: "text-amber-700",
    role: "status",
    ariaLive: "polite",
  },
  info: {
    container: "bg-blue-50 border-brand-primary border",
    title: "text-brand-primary font-bold",
    description: "text-brand-primary",
    icon: Info,
    iconColor: "text-brand-primary",
    role: "status",
    ariaLive: "polite",
  },
  error: {
    container: "bg-slate-50 border-slate-400 border",
    title: "text-slate-700 font-bold",
    description: "text-slate-700",
    icon: XCircle,
    iconColor: "text-slate-600",
    role: "alert",
  },
  success: {
    container: "bg-emerald-50 border-emerald-500 border",
    title: "text-emerald-800 font-bold",
    description: "text-emerald-800",
    icon: CheckCircle,
    iconColor: "text-emerald-700",
    role: "status",
    ariaLive: "polite",
  },
};

export function AlertBanner({
  variant,
  title,
  description,
  className = "",
}: AlertBannerProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      aria-atomic={config.ariaAtomic}
      className={`flex items-start gap-3 rounded-xl px-5 py-4 ${config.container} ${className}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.title}`}>{title}</p>
        {description && (
          <p className={`text-xs mt-1 ${config.description}`}>{description}</p>
        )}
      </div>
    </div>
  );
}
