import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary ${
            error ? "border-brand-danger focus:border-brand-danger focus:ring-brand-danger" : "border-slate-300"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-brand-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
