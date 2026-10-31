import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminLoginShell } from '@/features/auth/components/AdminLoginShell';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/authTypes';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

const fieldClass =
  'h-12 rounded-xl border-white/10 bg-black/45 pl-10 text-[15px] text-white shadow-none placeholder:text-white/35 hover:border-white/25 focus-visible:border-[#ff2d55]/70 focus-visible:ring-2 focus-visible:ring-[#ff2d55]/35 focus-visible:ring-offset-0';

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
    <AdminLoginShell
      title="Reset your password"
      subtitle="Enter your admin email and we'll send you reset instructions."
      footer={
        <Link
          to={ROUTES.login}
          className="group inline-flex items-center gap-1.5 font-semibold text-[#ff3b62] underline-offset-4 transition-colors hover:text-[#ff6b87] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b62]/50"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
          Back to sign in
        </Link>
      }
    >
      {resetSent ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-9 text-emerald-400" aria-hidden />
          <p className="text-sm font-semibold text-white">Check your inbox</p>
          <p className="text-sm text-white/65">If an admin account exists for that email, reset instructions are on the way.</p>
        </div>
      ) : (
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
                disabled={isSendingReset}
                className={fieldClass}
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-[#ff6b87]">{errors.email.message}</p>}
          </div>

          {forgotPasswordError && (
            <p role="alert" className="rounded-lg border border-[#ff2d55]/30 bg-[#ff2d55]/10 px-3 py-2 text-xs text-[#ff8da3]">
              Couldn't send reset instructions right now. Try again shortly.
            </p>
          )}

          <Button
            type="submit"
            disabled={isSendingReset}
            className="group h-12 w-full rounded-xl border-0 bg-gradient-to-r from-[#ff1f4b] to-[#e11d48] text-[15px] font-semibold text-white shadow-[0_10px_30px_-8px_rgba(255,31,75,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#ff3b62] hover:to-[#f43f5e] hover:shadow-[0_16px_36px_-8px_rgba(255,31,75,0.85)] active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {isSendingReset ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                Send reset instructions
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </>
            )}
          </Button>
        </form>
      )}
    </AdminLoginShell>
  );
}
