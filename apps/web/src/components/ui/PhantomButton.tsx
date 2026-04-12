"use client";

import React from "react";
import { toast } from "sonner";

interface PhantomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  featureName?: string;
  children: React.ReactNode;
}

export function PhantomButton({
  featureName = "Esta función",
  className = "",
  onClick,
  children,
  ...props
}: PhantomButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    toast.info("Próximamente", {
      description: `El módulo "${featureName}" se encuentra en desarrollo activo.`
    });
    
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function PhantomLink({ children, featureName = "Esta función", className = "" }: { children: React.ReactNode, featureName?: string, className?: string }) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info("Próximamente", {
          description: `El módulo "${featureName}" se encuentra en desarrollo activo.`
        });
    }

    return (
        <a href="#" onClick={handleClick} className={className}>
            {children}
        </a>
    )
}
