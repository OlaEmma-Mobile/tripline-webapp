'use client';

import { useState } from 'react';
import { BadgeCheck, UserPlus } from 'lucide-react';
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
import GlobalConfirmationDialog from '@/components/global-confirmation-dialog';

const drivers = [
  { name: 'Kelvin O.', vehicle: 'Toyota Hiace', status: 'Active' },
  { name: 'Aisha M.', vehicle: 'Sienna', status: 'Pending KYC' },
  { name: 'Tunde B.', vehicle: 'Toyota Coaster', status: 'Active' },
];

export default function AdminDriversPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-mono">Drivers</h2>
          <p className="text-sm text-muted-foreground font-sans">
            Onboard drivers, verify KYC, and assign vehicles.
          </p>
        </div>
        <DialogRoot>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add driver</DialogTitle>
              <DialogDescription>
                Capture driver details and assign a vehicle.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Driver name"
                className="w-full rounded-lg border border-input bg-background px-4 py-3"
              />
              <input
                type="tel"
                placeholder="Phone number"
                className="w-full rounded-lg border border-input bg-background px-4 py-3"
              />
              <input
                type="text"
                placeholder="Assigned vehicle"
                className="w-full rounded-lg border border-input bg-background px-4 py-3"
              />
            </div>
            <DialogFooter>
              <DialogClose className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">
                Cancel
              </DialogClose>
              <Button className="px-4">Save driver</Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold text-muted-foreground">
          Driver roster
        </div>
        <div className="divide-y divide-border">
          {drivers.map((driver) => (
            <div key={driver.name} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-foreground">{driver.name}</p>
                <p className="text-xs text-muted-foreground">{driver.vehicle}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {driver.status}
                </span>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <BadgeCheck className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GlobalConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Approve driver KYC"
        description="Approving will make this driver available for routes."
        confirmText="Approve"
        onConfirm={() => setConfirmOpen(false)}
      />
    </div>
  );
}
