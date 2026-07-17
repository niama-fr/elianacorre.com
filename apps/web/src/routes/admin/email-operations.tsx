import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import { Button } from "@ec/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ec/ui/components/dialog";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery as useConvexQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email-operations")({ component: AdminEmailOperationsPage });

const TASK_LABELS = {
  deleteContact: "Suppression d’un contact",
  sendConfirmationEmail: "E-mail de confirmation",
  sendEbookEmail: "E-mail de l’e-book",
  syncContact: "Synchronisation d’un contact",
} as const;

const FAILURE_LABELS = {
  authentication: "Authentification Loops refusée",
  environmentIsolation: "Envoi bloqué par l’isolation d’environnement",
  missingResource: "Modèle ou ressource Loops introuvable",
  network: "Connexion réseau indisponible",
  rateLimited: "Limite de débit Loops atteinte",
  server: "Service Loops indisponible",
  unknown: "Échec non classé",
  validation: "Requête Loops invalide",
} as const;

const formatDate = (timestamp: number | null) =>
  timestamp === null ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);

function AdminEmailOperationsPage() {
  const failedTasks = useConvexQuery(api.loops.listFailedTasks, {});
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"loopsTasks">>();
  const acknowledge = useMutation({ mutationFn: useConvexMutation(api.loops.acknowledgeFailedTask) });
  const replay = useMutation({ mutationFn: useConvexMutation(api.loops.replayFailedTask) });

  const replaySelectedTask = async () => {
    if (selectedTaskId === undefined) return;
    try {
      await replay.mutateAsync({ loopsTaskId: selectedTaskId });
      setSelectedTaskId(undefined);
      toast.success("La tâche a été relancée avec sa clé d’idempotence d’origine.");
    } catch {
      toast.error("La tâche n’a pas pu être relancée.");
    }
  };

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="font-extrabold text-3xl text-foreground">Opérations e-mail</h1>
        <p className="text-muted-foreground text-sm">
          Échecs terminaux nécessitant une intervention. Les destinataires et contenus ne sont pas affichés ici.
        </p>
      </header>

      {failedTasks === undefined && <p className="text-muted-foreground text-sm">Chargement…</p>}
      {failedTasks?.length === 0 && <p className="rounded-xl border p-4 text-muted-foreground text-sm">Aucune alerte active.</p>}
      {failedTasks && failedTasks.length > 0 && (
        <ul className="flex flex-col gap-3">
          {failedTasks.map((task) => (
            <li className="grid gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 sm:grid-cols-[1fr_auto]" key={task._id}>
              <div className="grid gap-1 text-sm">
                <strong>{TASK_LABELS[task.kind]}</strong>
                <span>{FAILURE_LABELS[task.failureCategory]}</span>
                <span>
                  Statut fournisseur : {task.failureStatus ?? "—"} · échec terminal : {formatDate(task.finishedAt)}
                </span>
                <span>
                  Alerte : {task.acknowledgedAt === null ? "à traiter" : `prise en compte le ${formatDate(task.acknowledgedAt)}`} · relances
                  : {task.replayCount}
                </span>
                <details>
                  <summary className="cursor-pointer">Historique Workflow ({task.workflowIds.length})</summary>
                  <ul className="mt-1 grid gap-1 pl-4">
                    {task.workflowIds.map((workflowId) => (
                      <li className="break-all text-red-800" key={workflowId}>
                        {workflowId}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
              <div className="flex items-start gap-2">
                {task.acknowledgedAt === null && (
                  <Button
                    disabled={acknowledge.isPending}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      acknowledge.mutate(
                        { loopsTaskId: task._id },
                        {
                          onError: () => toast.error("L’alerte n’a pas pu être prise en compte."),
                          onSuccess: () => toast.success("Alerte prise en compte."),
                        }
                      );
                    }}
                  >
                    Prendre en compte
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedTaskId(task._id);
                  }}
                >
                  Relancer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={selectedTaskId !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relancer cette tâche ?</DialogTitle>
            <DialogDescription>
              Vérifiez d’abord la cause dans Loops et dans l’historique Workflow. La relance conserve la clé d’idempotence d’origine afin
              d’éviter un envoi en double.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedTaskId(undefined);
              }}
            >
              Annuler
            </Button>
            <Button
              disabled={replay.isPending}
              type="button"
              onClick={() => {
                void replaySelectedTask();
              }}
            >
              {replay.isPending ? "Relance…" : "Relancer la tâche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
