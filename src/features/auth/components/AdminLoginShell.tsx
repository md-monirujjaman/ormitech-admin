import type { ReactNode } from 'react';
import heroUrl from '@/assets/auth/admin-hero.webp';
import logoUrl from '@/assets/auth/ormitech-logo-light.webp';

/**
 * The administrator sign-in screen: a human hand and a robot hand almost touching above the form, on a dark ground.
 * Purely visual. The form, the checks and the sign-in itself are in AdminLogin.
 *
 * The `dark` class makes every control inside use the dark theme, whatever theme the panel itself is set to.
 */
export function AdminLoginShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="dark relative isolate flex min-h-svh flex-col items-center overflow-hidden bg-[#06000b] px-4 pb-12 pt-24 text-white sm:pt-28 lg:pt-[7.25rem]">
      {/* The hands. Faded into the page at the bottom, and dimmed behind the form. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[340px] sm:h-[480px] lg:h-[min(44vw,700px)]">
        <img src={heroUrl} alt="" width={1600} height={700} className="login-fade h-full w-full object-cover object-[50%_0%]" decoding="async" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#06000b]" />
      </div>
      <div aria-hidden className="login-glow pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[34rem] w-[min(90vw,46rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(244,63,94,0.16),rgba(139,92,246,0.12)_55%,transparent)] blur-2xl" />

      <header className="login-rise flex flex-col items-center text-center [animation-delay:60ms]">
        <img src={logoUrl} alt="OrmiTech" width={750} height={225} className="h-auto w-[11.5rem] drop-shadow-[0_6px_28px_rgba(244,63,94,0.35)] sm:w-60" />
        <p className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-white/70 sm:text-base">OrmiTech Admin</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-1.5 max-w-xs text-xs text-white/60 sm:max-w-none sm:text-[13px]">{subtitle}</p>
      </header>

      <div className="login-rise relative mt-6 w-full max-w-[28rem] sm:mt-8 [animation-delay:160ms]">
        {/* A thin red-to-violet edge and a soft glow around the card. */}
        <div className="rounded-[1.75rem] bg-gradient-to-br from-[#ff2d55] via-[#c026d3]/45 to-[#8b5cf6] p-[1.5px] shadow-[0_0_70px_-12px_rgba(244,63,94,0.5),0_0_90px_-24px_rgba(139,92,246,0.6)]">
          <div className="rounded-[calc(1.75rem-1.5px)] bg-[#09040f]/90 p-6 backdrop-blur-xl sm:p-8">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-white/60">{footer}</div>}
      </div>
    </div>
  );
}
