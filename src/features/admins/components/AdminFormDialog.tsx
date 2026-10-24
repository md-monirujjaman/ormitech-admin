import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiErrorMessage } from '@/lib/apiError';
import type { CreateAdminInput } from '@/types/auth';
import { CONTENT_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../roles';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128, 'At most 128 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/\d/, 'Include a number'),
  access: z.enum(['admin', 'content', 'super']),
});

type Values = z.infer<typeof schema>;

/**
 * Creates an administrator.
 *
 * The password is set here rather than emailed: there is no reset link for platform administrators, by design
 * — see `authApi.forgotPassword`. Whoever creates the account passes the password on out of band, and the new
 * administrator changes it from their own profile, which ends every session but theirs.
 */
export function AdminFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateAdminInput) => Promise<unknown>;
  isPending: boolean;
  error: unknown;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '', password: '', access: 'admin' },
  });

  const access = watch('access');

  async function submit(values: Values) {
    try {
      await onSubmit({
        email: values.email,
        name: values.name,
        password: values.password,
        roles: values.access === 'super' ? [SUPER_ADMIN_ROLE] : values.access === 'content' ? [CONTENT_ADMIN_ROLE] : [],
      });
      reset();
      onOpenChange(false);
    } catch {
      // Shown below from `error`.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New administrator</DialogTitle>
          <DialogDescription>
            They can sign in to this panel immediately. Give them the password yourself — none is emailed.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" autoComplete="off" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-name">Name</Label>
            <Input id="admin-name" autoComplete="off" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Initial password</Label>
            <Input id="admin-password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with an uppercase letter, a lowercase letter and a number.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Access</Label>
            <Select value={access} onValueChange={(value) => setValue('access', value as Values['access'])}>
              <SelectTrigger aria-label="Access">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin: signs in, no administrator management</SelectItem>
                <SelectItem value="content">Content admin: writes the documentation</SelectItem>
                <SelectItem value="super">Super admin: manages other administrators</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {access === 'super'
                ? 'Can create, disable and re-role other administrators. Grant it sparingly.'
                : access === 'content'
                  ? 'Sees the Documentation screen and can write and publish pages. Nothing else.'
                  : 'Can sign in. Cannot manage administrators or write the documentation.'}
            </p>
          </div>

          {Boolean(error) && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {apiErrorMessage(error, 'Could not create the administrator.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create administrator'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
