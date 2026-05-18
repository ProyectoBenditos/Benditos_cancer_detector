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
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus:border-brand-primary ${
            error
              ? "border-slate-400 focus:border-slate-500 focus-visible:ring-slate-400"
              : "border-slate-300"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-slate-700 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
