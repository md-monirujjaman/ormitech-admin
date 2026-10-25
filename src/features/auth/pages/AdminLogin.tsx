import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { TurnstileWidget, type TurnstileHandle } from '@/features/auth/components/TurnstileWidget';
import { loginSchema, type LoginFormValues } from '@/features/auth/authTypes';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { getRememberPreference, getRememberedEmail, setRememberPreference, setRememberedEmail } from '@/store/sessionStorage';

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
    <AuthCard
      title="Sign in"
      subtitle="Internal control center — authorized administrators only."
      footer={
        <p>
          Forgot your password?{' '}
          <Link to={ROUTES.forgotPassword} className="font-medium text-primary hover:underline">
            Reset it
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@ormitech.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Remember me on this device
        </label>

        <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />

        {loginError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Couldn't sign in. Check your credentials, or the OrmiTech API may be unreachable.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isLoggingIn || !turnstileToken}>
          {isLoggingIn ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
