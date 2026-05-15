"use client";

import { memo, useMemo, useCallback, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface SupprimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  entityName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string; // Label personnalisé pour le bouton d'action
  // Optional: when provided, the dialog will also call `onDeleteLinkedUser(linkedUserId)`
  // after `onConfirm` resolves. This is useful to remove a related user record.
  linkedUserId?: number | null;
  onDeleteLinkedUser?: (userId: number) => Promise<any> | any;
}

function SupprimerDialogComponent({
  open,
  onOpenChange,
  title,
  description,
  entityName,
  onConfirm,
  isLoading = false,
  confirmLabel = "Supprimer",
  linkedUserId = null,
  onDeleteLinkedUser,
}: SupprimerDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const busy = isLoading || internalLoading;

  const handleConfirm = useCallback(async () => {
    setInternalLoading(true);
    try {
      // allow onConfirm to be async
      const maybePromise: any = (onConfirm as any)();
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }

      // if a linked user id and delete handler provided, call it
      if (typeof linkedUserId === "number" && onDeleteLinkedUser) {
        await onDeleteLinkedUser(linkedUserId);
      }

      onOpenChange(false);
    } catch (err) {
      // Keep dialog open on error; caller can surface error to user
      // Log for debugging
       
      console.error("SupprimerDialog confirm error:", err);
    } finally {
      setInternalLoading(false);
    }
  }, [onConfirm, onOpenChange, linkedUserId, onDeleteLinkedUser]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const dialogTitle = useMemo(() => {
    if (title) return title;
    return entityName ? `Supprimer ${entityName} ?` : "Supprimer ?";
  }, [title, entityName]);

  const dialogDescription = useMemo(() => {
    return description || "Cette action est irréversible.";
  }, [description]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 rounded-t-lg!">
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-4 rounded-t-lg">
            <Trash2 className="size-4 text-destructive" />
            <DialogTitle className="text-sm!">{dialogTitle}</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pt-2 px-4 pb-0! text-xs!">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <DialogFooter className="px-4 py-3">
          <Button variant="outline" onClick={handleCancel} disabled={busy}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const SupprimerDialog = memo(SupprimerDialogComponent);
export default SupprimerDialog;
