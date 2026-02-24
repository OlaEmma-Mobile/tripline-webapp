'use client';

import { useState } from 'react';
import { Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import GlobalAlertDialog from '@/components/global-alert-dialog';

const riders = [
  { name: 'Tola Okoro', company: 'Finch Labs', status: 'Active' },
  { name: 'Damilola Ade', company: 'Metro Finance', status: 'Pending' },
  { name: 'Seyi Yusuf', company: 'Lagos Tech', status: 'Active' },
];

export default function AdminRidersPage() {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-mono">Riders</h2>
          <p className="text-sm text-muted-foreground font-sans">
            Manage rider accounts and invitations.
          </p>
        </div>
        <DialogRoot>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite rider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite rider</DialogTitle>
              <DialogDescription>
                Send an invitation to a corporate rider to join Tripline.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Rider name"
                className="w-full rounded-lg border border-input bg-background px-4 py-3"
              />
              <input
                type="email"
                placeholder="Rider email"
                className="w-full rounded-lg border border-input bg-background px-4 py-3"
              />
              <input
                type="text"
                placeholder="Company"
                className="w-full rounded-lg border border-input bg-background px-4 py-3"
              />
            </div>
            <DialogFooter>
              <DialogClose className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">
                Cancel
              </DialogClose>
              <Button className="px-4">Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold text-muted-foreground">
          Active riders
        </div>
        <div className="divide-y divide-border">
          {riders.map((rider) => (
            <div key={rider.name} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-foreground">{rider.name}</p>
                <p className="text-xs text-muted-foreground">{rider.company}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {rider.status}
                </span>
                <button
                  onClick={() => setAlertOpen(true)}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GlobalAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Resend invitation"
        description="Invitation email sent to the rider."
        actionText="Done"
      />
    </div>
  );
}
