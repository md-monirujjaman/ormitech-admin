import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { organizationSchema, type OrganizationFormValues } from '@/features/organizations/schemas';
import { TENANT_STATUSES, type Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function OrganizationFormDialog({
  open,
  onOpenChange,
  organization,
  plans,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent means "create"; present means "edit that organization". */
  organization?: Organization;
  plans: Plan[];
  isPending: boolean;
  error?: unknown;
  onSubmit: (values: OrganizationFormValues) => void;
}) {
  const isEdit = Boolean(organization);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      ownerName: '',
      ownerEmail: '',
      status: 'PENDING',
      planId: plans[0]?.id ?? '',
    },
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      organization
        ? {
            name: organization.name,
            slug: organization.slug,
            ownerName: organization.ownerName,
            ownerEmail: organization.ownerEmail,
            status: organization.status,
            planId: organization.planId,
          }
        : { name: '', slug: '', ownerName: '', ownerEmail: '', status: 'PENDING', planId: plans[0]?.id ?? '' },
    );
  }, [open, organization, plans, reset]);

  const name = watch('name');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit organization' : 'Create organization'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the organization profile. Entitlements are managed on the organization’s Plan, Features and Channels tabs.'
              : 'Create a tenant and assign its starting plan. Entitlements come from that plan until you override them.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 py-2" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              {...register('name')}
              onBlur={() => {
                // Only auto-fill the slug while creating, so an existing organization's URLs never shift underneath it.
                if (!isEdit && name && !watch('slug')) setValue('slug', slugify(name), { shouldValidate: true });
              }}
            />
            {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input id="org-slug" {...register('slug')} placeholder="acme-retail" />
            {formState.errors.slug && <p className="text-xs text-destructive">{formState.errors.slug.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-owner">Owner name</Label>
              <Input id="org-owner" {...register('ownerName')} />
              {formState.errors.ownerName && <p className="text-xs text-destructive">{formState.errors.ownerName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email">Owner email</Label>
              <Input id="org-email" type="email" {...register('ownerEmail')} />
              {formState.errors.ownerEmail && <p className="text-xs text-destructive">{formState.errors.ownerEmail.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="org-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-plan">Plan</Label>
              <Controller
                control={control}
                name="planId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="org-plan">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {formState.errors.planId && <p className="text-xs text-destructive">{formState.errors.planId.message}</p>}
            </div>
          </div>

          {Boolean(error) && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Couldn&apos;t save the organization. Check the details and try again.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
