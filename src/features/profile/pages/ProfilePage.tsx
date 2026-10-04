import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { apiErrorMessage } from '@/lib/apiError';

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
});

/** The API's policy, mirrored so the form can say what is wrong before the request. The API enforces it. */
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128, 'At most 128 characters')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password you have not used here before',
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/**
 * The administrator's own account.
 *
 * Name and password only. The email address is the login identifier and this screen deliberately cannot
 * change it: that needs a flow for the typo that locks an operator out, which is not this one. Roles are
 * shown but not editable here — an administrator cannot grant themselves anything, which is the whole point
 * of putting role changes behind `super_admin` on the server.
 */
export default function ProfilePage() {
  const {
    admin,
    updateProfile,
    isUpdatingProfile,
    profileError,
    profileSaved,
    changePassword,
    isChangingPassword,
    passwordError,
    passwordChanged,
  } = useAuth();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: admin?.name ?? '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!admin) return null;

  async function onSaveProfile(values: ProfileValues) {
    try {
      await updateProfile({ name: values.name });
    } catch {
      // Shown below from `profileError`.
    }
  }

  async function onChangePassword(values: PasswordValues) {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordForm.reset();
    } catch {
      // Shown below from `passwordError`.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your profile"
        description="Your administrator account on the OrmiTech platform."
        showMockNotice={false}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Your name is what appears in the audit trail next to what you do.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={profileForm.handleSubmit(onSaveProfile)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" autoComplete="name" {...profileForm.register('name')} />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={admin.email} readOnly disabled />
                <p className="text-xs text-muted-foreground">
                  Your sign-in address. Changing it is not done from here.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Roles</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {admin.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role.replace('_', ' ').toLowerCase()}
                      </Badge>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last sign-in</dt>
                  <dd className="mt-1 text-foreground">{formatDate(admin.lastLoginAt)}</dd>
                </div>
              </dl>

              {profileError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {apiErrorMessage(profileError, 'Could not save your profile.')}
                </p>
              )}
              {profileSaved && !profileError && (
                <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  Profile saved.
                </p>
              )}

              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription>
              Your current password is required. Changing it signs out your other sessions and leaves this one
              signed in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onChangePassword)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword ? (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters, with an uppercase letter, a lowercase letter and a number.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {passwordError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {apiErrorMessage(passwordError, 'Could not change your password.')}
                </p>
              )}
              {passwordChanged && !passwordError && (
                <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  Password changed. {passwordChanged.sessionsRevoked} other session
                  {passwordChanged.sessionsRevoked === 1 ? '' : 's'} signed out.
                </p>
              )}

              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing…' : 'Change password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
