import type { MouseEvent } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CatalogDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function CatalogDeleteDialog({
  open,
  title,
  description,
  isDeleting,
  onOpenChange,
  onConfirm,
}: CatalogDeleteDialogProps) {
  const onConfirmClick = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const onActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void onConfirmClick();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50 text-red-700">
            <Trash2 className="h-6 w-6" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onActionClick}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
