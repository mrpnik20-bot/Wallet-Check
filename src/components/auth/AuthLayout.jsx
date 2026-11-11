import { BrandMark } from "@/components/wallet/AppShell";

// Full-screen auth card. It sets its own color tokens so it stays readable under any theme.
export function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(560px_240px_at_50%_0%,rgba(59,130,246,0.22),transparent_72%)]"
      />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <BrandMark />
          <div className="leading-none">
            <p className="text-[16.5px] font-bold tracking-tight">Meridian</p>
            <p className="mt-1 text-[8.5px] uppercase tracking-[0.22em] text-muted-foreground">multichain wallet</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-[21px] font-bold leading-tight tracking-tight">{title}</h1>
              {subtitle && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>

        {footer && <p className="mt-6 text-center text-[12.5px] text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}