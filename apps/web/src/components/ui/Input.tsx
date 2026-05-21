import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id: passedId, ...props }, ref) => {
    const generatedId = React.useId();
    const id = passedId ?? generatedId;
    const errorId = error ? `${id}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus:border-brand-primary ${
            error
              ? "border-slate-400 focus:border-slate-500 focus-visible:ring-slate-400"
              : "border-slate-300"
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-slate-700 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
