import React from "react";

/**
 * Centered auth card on the canvas: logo, condensed title, one sentence, a
 * white panel for the form. `icon` is accepted for compatibility; the logo
 * replaces it.
 */
// eslint-disable-next-line no-unused-vars
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <img src="/koach-logo-dark.png" alt="KOACH" className="h-7 w-auto dark:hidden" />
        <img src="/koach-logo-white.png" alt="KOACH" className="hidden h-7 w-auto dark:block" />
        <h1 className="mt-10 text-[36px] leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
        <div className="panel mt-6 p-6 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  );
}
