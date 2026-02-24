'use client';

import { motion } from 'framer-motion';
import {
  AlertDialogRoot,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface GlobalAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionText?: string;
}

export default function GlobalAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  actionText = 'Okay',
}: GlobalAlertDialogProps) {
  return (
    <AlertDialogRoot open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AlertDialogAction className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                {actionText}
              </AlertDialogAction>
            </motion.div>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}
