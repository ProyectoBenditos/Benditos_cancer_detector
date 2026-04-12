import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div 
      className={`rounded-2xl border border-slate-200 bg-brand-surface shadow-sm ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
    return (
      <div className={`p-6 pb-4 border-b border-slate-100 ${className}`} {...props}>
        {children}
      </div>
    );
}

export function CardContent({ children, className = "", ...props }: CardProps) {
    return (
      <div className={`p-6 ${className}`} {...props}>
        {children}
      </div>
    );
}
