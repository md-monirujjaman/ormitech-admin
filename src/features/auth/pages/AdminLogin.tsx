import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { AdminLoginShell } from '@/features/auth/components/AdminLoginShell';
import { ArrowRight, LoaderCircle, Lock, Mail } from 'lucide-react';
import { TurnstileWidget, type TurnstileHandle } from '@/features/auth/components/TurnstileWidget';
import { loginSchema, type LoginFormValues } from '@/features/auth/authTypes';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { getRememberPreference, getRememberedEmail, setRememberPreference, setRememberedEmail } from '@/store/sessionStorage';

/** The look of the two fields: dark glass, a red ring on focus. */
const fieldClass =
  'h-12 rounded-xl border-white/10 bg-black/45 pl-10 text-[15px] text-white shadow-none placeholder:text-white/35 hover:border-white/25 focus-visible:border-[#ff2d55]/70 focus-visible:ring-2 focus-visible:ring-[#ff2d55]/35 focus-visible:ring-offset-0';

export default function AdminLogin() {
  const { login, isLoggingIn, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: getRememberedEmail(), password: '' } });
  const [remember, setRemember] = useState(getRememberPreference);

  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);

  // A Turnstile token works once, so a failed attempt needs a fresh check.
  useEffect(() => {
    if (loginError) turnstileRef.current?.reset();
  }, [loginError]);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;

  async function onSubmit(values: LoginFormValues) {
    // Decided before the session is written, so it lands in the right place (see `sessionStateStorage`).
    setRememberPreference(remember);
    try {
      await login({ ...values, turnstileToken });
      setRememberedEmail(remember ? values.email : null);
      navigate(redirectTo, { replace: true });
    } catch {
      // Surfaced below via `loginError` — swallow here so react-hook-form doesn't also log an unhandled rejection.
    }
  }

  return (
    <AdminLoginShell
      title="Sign in"
      subtitle="Internal control center — authorized administrators only."
      footer={
        <p>
          Forgot your password?{' '}
          <Link to={ROUTES.forgotPassword} className="font-semibold text-[#ff3b62] underline-offset-4 transition-colors hover:text-[#ff6b87] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b62]/50">
            Reset it
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-semibold text-white">
            Email
          </Label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/55 transition-colors group-focus-within:text-[#ff3b62]" aria-hidden />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@ormitech.com"
              disabled={isLoggingIn}
              className={fieldClass}
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-[#ff6b87]">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-semibold text-white">
            Password
          </Label>
          <div className="group relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/55 transition-colors group-focus-within:text-[#ff3b62]" aria-hidden />
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoggingIn}
              className={`${fieldClass} pr-11`}
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
          </div>
          {errors.password && <p className="text-xs text-[#ff6b87]">{errors.password.message}</p>}
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-white/85 transition-colors hover:text-white">
          <input
            type="checkbox"
            checked={remember}
            disabled={isLoggingIn}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-[1.05rem] cursor-pointer rounded border-white/30 accent-[#ff2d55] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2d55]/60"
          />
          Remember me on this device
        </label>

        <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />

        {loginError && (
          <p role="alert" className="rounded-xl border border-[#ff2d55]/30 bg-[#ff2d55]/10 px-3.5 py-2.5 text-xs text-[#ff9db0]">
            Couldn't sign in. Check your credentials, or the OrmiTech API may be unreachable.
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoggingIn || !turnstileToken}
          className="group h-12 w-full rounded-xl border-0 bg-gradient-to-r from-[#ff1f4b] to-[#e11d48] text-[15px] font-semibold text-white shadow-[0_10px_30px_-8px_rgba(255,31,75,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#ff3b62] hover:to-[#f43f5e] hover:shadow-[0_16px_36px_-8px_rgba(255,31,75,0.85)] active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {isLoggingIn ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </>
          )}
        </Button>
      </form>
    </AdminLoginShell>
  );
}
