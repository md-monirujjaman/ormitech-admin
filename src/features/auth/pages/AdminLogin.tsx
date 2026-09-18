import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { loginSchema, type LoginFormValues } from '@/features/auth/authTypes';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

export default function AdminLogin() {
  const { login, isLoggingIn, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values);
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
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {loginError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Couldn't sign in. Check your credentials, or the OrmiTech API may be unreachable.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isLoggingIn}>
          {isLoggingIn ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
