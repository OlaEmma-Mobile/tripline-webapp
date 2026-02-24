import * as React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { cn } from '@/lib/utils';

const AlertDialogRoot = AlertDialog.Root;
const AlertDialogTrigger = AlertDialog.Trigger;
const AlertDialogPortal = AlertDialog.Portal;
const AlertDialogCancel = AlertDialog.Cancel;
const AlertDialogAction = AlertDialog.Action;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialog.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out',
      className
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialog.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialog.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialog.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialog.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg focus:outline-none',
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialog.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-2 text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)} {...props} />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialog.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialog.Title>
>(({ className, ...props }, ref) => (
  <AlertDialog.Title
    ref={ref}
    className={cn('text-xl font-bold text-foreground font-mono', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialog.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialog.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialog.Description>
>(({ className, ...props }, ref) => (
  <AlertDialog.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground font-sans', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialog.Description.displayName;

export {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
