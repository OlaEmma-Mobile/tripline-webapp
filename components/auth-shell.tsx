import React from 'react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="w-full">
      <div className="bg-card p-8 sm:p-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-mono mb-3">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm sm:text-base text-muted-foreground font-sans">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="space-y-6">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
