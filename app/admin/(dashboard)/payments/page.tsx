'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobalAlertDialog from '@/components/global-alert-dialog';

const payments = [
  { company: 'Finch Labs', amount: '₦420,000', status: 'Paid' },
  { company: 'Metro Finance', amount: '₦280,000', status: 'Pending' },
  { company: 'Lagos Tech', amount: '₦520,000', status: 'Paid' },
];

export default function AdminPaymentsPage() {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-mono">Payments</h2>
          <p className="text-sm text-muted-foreground font-sans">
            Track corporate invoices and settlement status.
          </p>
        </div>
        <Button onClick={() => setAlertOpen(true)} className="gap-2">
          <FileText className="h-4 w-4" />
          Generate invoice
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold text-muted-foreground">
          Recent payments
        </div>
        <div className="divide-y divide-border">
          {payments.map((payment) => (
            <div key={payment.company} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-foreground">{payment.company}</p>
                <p className="text-xs text-muted-foreground">Monthly invoice</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-foreground">{payment.amount}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GlobalAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Invoice generated"
        description="A draft invoice has been created for the selected company."
        actionText="Done"
      />
    </div>
  );
}
