'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobalAlertDialog from '@/components/global-alert-dialog';

const reports = [
  { title: 'Monthly Performance Summary', range: 'Jan 2026', status: 'Ready' },
  { title: 'Driver On-time Report', range: 'Last 7 days', status: 'Ready' },
  { title: 'Seat Utilization by Route', range: 'Q1 2026', status: 'Generating' },
];

export default function AdminReportsPage() {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-mono">Reports</h2>
          <p className="text-sm text-muted-foreground font-sans">
            Export performance reports and usage summaries.
          </p>
        </div>
        <Button onClick={() => setAlertOpen(true)} className="gap-2">
          <Download className="h-4 w-4" />
          Export all
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold text-muted-foreground">
          Available reports
        </div>
        <div className="divide-y divide-border">
          {reports.map((report) => (
            <div key={report.title} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-foreground">{report.title}</p>
                <p className="text-xs text-muted-foreground">{report.range}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {report.status}
                </span>
                <button className="text-sm font-semibold text-primary hover:underline">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GlobalAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Report export started"
        description="We are preparing the report bundle. You will be notified when it is ready."
        actionText="Done"
      />
    </div>
  );
}
