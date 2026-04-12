"use client";

import React from "react";

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
    
    alert(`${featureName} estará disponible próximamente en OncaScan.`);
    
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
        alert(`${featureName} estará disponible próximamente en OncaScan.`);
    }

    return (
        <a href="#" onClick={handleClick} className={className}>
            {children}
        </a>
    )
}
