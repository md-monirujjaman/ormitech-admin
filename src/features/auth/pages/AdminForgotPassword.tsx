import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/authTypes';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

export default function AdminForgotPassword() {
  const { forgotPassword, isSendingReset, forgotPasswordError, resetSent } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword(values);
    } catch {
      // Surfaced via `forgotPasswordError` below.
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your admin email and we'll send you reset instructions."
      footer={
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {resetSent ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="text-sm font-medium text-foreground">Check your inbox</p>
          <p className="text-sm text-muted-foreground">If an admin account exists for that email, reset instructions are on the way.</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@ormitech.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {forgotPasswordError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Couldn't send reset instructions right now. Try again shortly.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSendingReset}>
            {isSendingReset ? 'Sending…' : 'Send reset instructions'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
