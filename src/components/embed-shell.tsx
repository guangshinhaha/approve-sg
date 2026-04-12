import { CheckCircle } from "lucide-react";

interface EmbedShellProps {
  children: React.ReactNode;
  cssVars?: Record<string, string>;
  logoUrl?: string | null;
}

/**
 * Shared wrapper for all embed pages. Injects theme CSS variables,
 * optional logo, and the "Powered by ApproveSG" footer.
 */
export function EmbedShell({ children, cssVars, logoUrl }: EmbedShellProps) {
  const style = cssVars && Object.keys(cssVars).length > 0 ? cssVars : undefined;

  return (
    <div
      className="min-h-screen bg-white p-6 font-sans"
      style={style as React.CSSProperties | undefined}
    >
      {/* Optional branded logo */}
      {logoUrl && (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Organization logo"
            className="h-8 w-auto object-contain"
          />
        </div>
      )}

      {children}

      {/* Powered by footer */}
      <div className="mt-8 pt-4 border-t border-approve-border flex items-center gap-1.5">
        <div className="w-4 h-4 bg-approve-primary rounded-[3px] flex items-center justify-center">
          <CheckCircle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
        <span className="text-[11px] text-grey-400">Powered by ApproveSG</span>
      </div>
    </div>
  );
}
