"use client";

import { memo, useState, useCallback } from "react";
import { Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { planifyPremiumCandidats } from "@/api/admin/premium";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AffecterPremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  hasImmediateOption?: boolean;
  hasScheduleOption?: boolean;
  onConfirmImmediate?: () => void;
  onConfirmScheduled?: (date: Date) => void;
  isLoading?: boolean;
  affectCount?: number;
  deactivateCount?: number;
  scheduledDate?: string; // Date de planification existante au format YYYY-MM-DD
  candidateIds?: number[]; // IDs des candidats pour la planification directe
  onScheduleSuccess?: () => void; // Callback quand la programmation réussit
}

function AffecterPremiumDialogComponent({
  open,
  onOpenChange,
  title,
  description,
  hasImmediateOption = true,
  hasScheduleOption = true,
  onConfirmImmediate,
  isLoading = false,
  affectCount = 0,
  deactivateCount = 0,
  scheduledDate,
  candidateIds = [],
  onScheduleSuccess,
}: AffecterPremiumDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    scheduledDate
      ? new Date(scheduledDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleConfirmImmediate = useCallback(() => {
    if (onConfirmImmediate) {
      onConfirmImmediate();
    }
    onOpenChange(false);
  }, [onConfirmImmediate, onOpenChange]);

  const handleConfirmScheduled = useCallback(async () => {
    if (!selectedDate || candidateIds.length === 0) return;

    setIsScheduling(true);
    try {
      const premiumDate = selectedDate.toLocaleDateString("en-CA"); // Format YYYY-MM-DD sans conversion UTC
      await planifyPremiumCandidats(candidateIds, premiumDate);

      toast.success(
        `Premium programmé pour ${candidateIds.length} candidat(s) à partir du ${selectedDate.toLocaleDateString("fr-FR")}`,
      );

      onScheduleSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Impossible de programmer le premium. Veuillez réessayer.");
    } finally {
      setIsScheduling(false);
    }
  }, [selectedDate, candidateIds, onOpenChange, onScheduleSuccess]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] p-0 rounded-t-lg!">
        <DialogHeader>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-4 rounded-t-lg">
            <Calendar className="size-4 text-primary" />
            <DialogTitle className="text-base!">
              {title || "Gérer le statut premium"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground p-4 pb-0!">
            {description || "Choisissez comment gérer le statut premium"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-4">
          {/* Show scheduled date info if exists */}
          {scheduledDate && (
            <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Premium déjà programmé
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                    Activation prévue le{" "}
                    <span className="font-semibold">
                      {new Date(scheduledDate).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show options only if we have candidates without premium */}
          {affectCount > 0 && (
            <>
              <div className="space-y-3">
                {/* Immediate Option */}
                {hasImmediateOption && (
                  <div
                    className="border-2 border-primary/30 rounded-lg p-4 cursor-pointer hover:bg-primary/5 transition"
                    onClick={() => !isLoading && handleConfirmImmediate()}
                  >
                    <div className="flex items-start gap-3">
                      <Clock className="size-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">
                          Rendre Premium Maintenant
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Activer immédiatement le statut premium pour{" "}
                          <span className="font-medium">{affectCount}</span>{" "}
                          candidat(s)
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmImmediate();
                        }}
                        disabled={isLoading}
                        className="mt-0"
                      >
                        Maintenant
                      </Button>
                    </div>
                  </div>
                )}

                {/* Scheduled Option */}
                {hasScheduleOption && affectCount > 0 && (
                  <div className="border-2 border-primary/30 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Calendar className="size-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">
                          Rendre Premium Ultérieurement
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Programmer l'activation pour{" "}
                          <span className="font-medium">{affectCount}</span>{" "}
                          candidat(s)
                        </p>
                      </div>
                    </div>

                    <div className="ml-8 space-y-2">
                      <Popover
                        open={showCalendar}
                        onOpenChange={setShowCalendar}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-left font-normal"
                            disabled={isLoading}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {selectedDate
                              ? selectedDate.toLocaleDateString("fr-FR", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              setShowCalendar(false);
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {selectedDate && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={handleConfirmScheduled}
                          disabled={isLoading || isScheduling || !selectedDate}
                        >
                          {isScheduling ? "Programmation..." : "Programmer"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Separator if we have both options */}
              {deactivateCount > 0 && affectCount > 0 && (
                <Separator className="my-4" />
              )}
            </>
          )}

          {/* Deactivation info - no options, just confirmation */}
          {deactivateCount > 0 && (
            <div className="border-2 border-destructive/30 rounded-lg p-4 bg-destructive/5">
              <div className="flex items-start gap-3">
                <div className="size-5 text-destructive mt-0.5 font-bold">
                  ⊘
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    Désactivation du Premium
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Le statut premium sera retiré immédiatement pour{" "}
                    <span className="font-medium">{deactivateCount}</span>{" "}
                    candidat(s)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />
        <DialogFooter className="px-4 py-3">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Annuler
          </Button>
          {!affectCount && deactivateCount > 0 && (
            <Button
              variant="destructive"
              onClick={handleConfirmImmediate}
              disabled={isLoading}
            >
              {isLoading ? "Traitement..." : "Désactiver Premium"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const AffecterPremiumDialog = memo(AffecterPremiumDialogComponent);
export default AffecterPremiumDialog;
