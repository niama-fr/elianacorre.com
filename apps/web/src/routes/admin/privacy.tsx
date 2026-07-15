import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import { Button } from "@ec/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ec/ui/components/dialog";
import { Input } from "@ec/ui/components/input";
import { Item, ItemContent, ItemHeader, ItemTitle } from "@ec/ui/components/item";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery as useConvexQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/privacy")({ component: AdminPrivacyPage });

type PrivacySubject = NonNullable<FunctionReturnType<typeof api.privacy.inspectSubject>>;
type Operation = "access" | "erasure" | "export" | "objection" | "rectification" | "suppressionRemoval" | "unsubscription";
type VerificationMethod = "additionalEvidence" | "emailChallenge";

const OPERATION_LABELS: Record<Operation, string> = {
  access: "Traiter la demande d’accès",
  erasure: "Effacer les données",
  export: "Exporter les données",
  objection: "Enregistrer une opposition",
  rectification: "Rectifier le prénom",
  suppressionRemoval: "Lever la suppression vérifiée",
  unsubscription: "Désinscrire de la newsletter",
};

const formatDate = (timestamp: number | null) =>
  timestamp === null ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);

function AdminPrivacyPage() {
  const [emailInput, setEmailInput] = useState("");
  const [searchedEmail, setSearchedEmail] = useState<string>();
  const subject = useConvexQuery(api.privacy.inspectSubject, searchedEmail ? { email: searchedEmail } : "skip");

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="font-extrabold text-3xl text-foreground">Demandes de confidentialité</h1>
        <p className="text-muted-foreground text-sm">Recherche exacte par adresse canonique. Aucune opération groupée n’est disponible.</p>
      </header>

      <form
        className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchedEmail(emailInput);
        }}
      >
        <label className="flex flex-1 flex-col gap-2 font-medium text-sm" htmlFor="privacy-email">
          Adresse e-mail de la personne vérifiée
          <Input
            required
            id="privacy-email"
            type="email"
            value={emailInput}
            onChange={(event) => {
              setEmailInput(event.target.value);
            }}
          />
        </label>
        <Button type="submit">Rechercher</Button>
      </form>

      {searchedEmail && subject === undefined && <p className="text-muted-foreground text-sm">Recherche en cours…</p>}
      {searchedEmail && subject === null && (
        <p className="rounded-2xl border p-4 text-muted-foreground text-sm">Aucune donnée connue pour cette adresse.</p>
      )}
      {searchedEmail && subject && <PrivacySubjectView key={searchedEmail} email={searchedEmail} subject={subject} />}
    </section>
  );
}

function PrivacySubjectView({ email, subject }: { email: string; subject: PrivacySubject }) {
  return (
    <div className="flex flex-col gap-6">
      <IdentitySection subject={subject} />
      <ConsentSection subject={subject} />
      <DeliverySection subject={subject} />
      <EbookSection subject={subject} />
      <AuditSection subject={subject} />
      <VerificationSection email={email} subject={subject} />
      <PrivacyOperations email={email} subject={subject} />
    </div>
  );
}

function IdentitySection({ subject }: { subject: PrivacySubject }) {
  return (
    <PrivacySection title="Identité">
      {subject.profile ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Detail label="E-mail" value={subject.profile.email} />
          <Detail label="Prénom" value={subject.profile.firstName ?? "—"} />
          <Detail label="Rôle" value={subject.profile.role} />
        </dl>
      ) : (
        <p className="text-muted-foreground text-sm">Aucun profil identifiant conservé.</p>
      )}
    </PrivacySection>
  );
}

function ConsentSection({ subject }: { subject: PrivacySubject }) {
  return (
    <PrivacySection title="Consentement newsletter">
      {subject.newsletterConsent.periods.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune période de consentement.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Demandé</th>
                <th className="p-2">Confirmé</th>
                <th className="p-2">Désinscrit</th>
              </tr>
            </thead>
            <tbody>
              {subject.newsletterConsent.periods.map((period) => (
                <tr className="border-b last:border-0" key={period._id}>
                  <td className="p-2">{formatDate(period.requestedAt)}</td>
                  <td className="p-2">{formatDate(period.confirmedAt)}</td>
                  <td className="p-2">{formatDate(period.unsubscribedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PrivacySection>
  );
}

function DeliverySection({ subject }: { subject: PrivacySubject }) {
  return (
    <PrivacySection title="Éligibilité de livraison et état de confidentialité">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Detail label="Éligible" value={subject.deliveryEligibility.eligible ? "Oui" : "Non"} />
        <Detail label="État" value={subject.deliveryEligibility.status} />
        <Detail label="Suppression" value={subject.privacyState.suppressed ? "Active" : "Absente"} />
      </dl>
      {subject.deliveryEligibility.restriction && (
        <p className="mt-3 text-sm">
          Restriction : {subject.deliveryEligibility.restriction.reason} · origine {subject.deliveryEligibility.restriction.restrictedBy}
        </p>
      )}
    </PrivacySection>
  );
}

function EbookSection({ subject }: { subject: PrivacySubject }) {
  return (
    <PrivacySection title="Historique de l’e-book de bienvenue">
      {subject.welcomeEbookAccess.issuances.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune délivrance conservée.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {subject.welcomeEbookAccess.issuances.map((issuance) => (
            <li className="rounded-xl border p-3" key={issuance._id}>
              {formatDate(issuance._creationTime)} · {issuance.kind} · {issuance.ebook.title} (version {issuance.ebook.version})
            </li>
          ))}
        </ul>
      )}
    </PrivacySection>
  );
}

function AuditSection({ subject }: { subject: PrivacySubject }) {
  return (
    <PrivacySection title="Historique des opérations de confidentialité">
      {subject.privacyState.audits.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune opération enregistrée.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {subject.privacyState.audits.map((audit) => (
            <li className="grid gap-1 rounded-xl border p-3 sm:grid-cols-4" key={audit._id}>
              <span>{formatDate(audit._creationTime)}</span>
              <span>
                {audit.kind}
                {audit.kind === "verification" ? ` · ${audit.requestKind} · ${audit.method}` : ""}
              </span>
              <span>{audit.outcome}</span>
              <span className="break-all text-muted-foreground">Admin : {audit.performedBy}</span>
            </li>
          ))}
        </ul>
      )}
    </PrivacySection>
  );
}

function VerificationSection({ email, subject }: { email: string; subject: PrivacySubject }) {
  const [method, setMethod] = useState<VerificationMethod>("emailChallenge");
  const [requestKind, setRequestKind] = useState<Operation>("access");
  const [outcome, setOutcome] = useState<"completed" | "rejected">();
  const verification = useMutation({ mutationFn: useConvexMutation(api.privacy.recordVerification) });

  const confirm = async () => {
    if (outcome === undefined) return;
    try {
      await verification.mutateAsync({ email, method, outcome, requestKind });
      toast.success("Résultat de vérification enregistré.");
      setOutcome(undefined);
    } catch {
      toast.error("Le résultat de vérification n’a pas été enregistré.");
    }
  };

  return (
    <PrivacySection title="Vérification d’identité">
      <p className="mb-4 text-muted-foreground text-sm">
        Enregistrez uniquement la catégorie de méthode et son résultat, jamais les preuves.
      </p>
      {subject.privacyState.authorizations.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1 text-sm">
          {subject.privacyState.authorizations.map((authorization) => (
            <li key={authorization.requestKind}>
              Autorisation {authorization.requestKind} valable jusqu’au {formatDate(authorization.expiresAt)}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Demande concernée
          <select
            className="h-9 rounded-md border bg-transparent px-3"
            value={requestKind}
            onChange={(event) => {
              setRequestKind(event.target.value as Operation);
            }}
          >
            {Object.entries(OPERATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Méthode
          <select
            className="h-9 rounded-md border bg-transparent px-3"
            value={method}
            onChange={(event) => {
              setMethod(event.target.value as VerificationMethod);
            }}
          >
            <option value="emailChallenge">Défi envoyé à l’adresse canonique</option>
            <option value="additionalEvidence">Preuve supplémentaire proportionnée</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            setOutcome("completed");
          }}
        >
          Enregistrer comme vérifiée
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOutcome("rejected");
          }}
        >
          Enregistrer comme non vérifiée
        </Button>
      </div>
      <Dialog
        open={outcome !== undefined}
        onOpenChange={(open) => {
          if (!open) setOutcome(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le résultat de vérification</DialogTitle>
            <DialogDescription>
              Enregistrer la demande {requestKind} pour {email} comme {outcome === "completed" ? "vérifiée" : "non vérifiée"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button disabled={verification.isPending} onClick={() => void confirm()}>
              {verification.isPending ? "Enregistrement…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PrivacySection>
  );
}

function PrivacyOperations({ email, subject }: { email: string; subject: PrivacySubject }) {
  const [operation, setOperation] = useState<Operation>();
  const [firstName, setFirstName] = useState(subject.profile?.firstName ?? "");
  const access = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillAccessRequest) });
  const erase = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillErasureRequest) });
  const exportData = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillExportRequest) });
  const object = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillObjectionRequest) });
  const rectify = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillRectificationRequest) });
  const removeSuppression = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillSuppressionRemovalRequest) });
  const unsubscribe = useMutation({ mutationFn: useConvexMutation(api.privacy.fulfillUnsubscriptionRequest) });
  const isPending = [access, erase, exportData, object, rectify, removeSuppression, unsubscribe].some(({ isPending: pending }) => pending);
  const isAuthorized = (requestKind: Operation) =>
    subject.privacyState.authorizations.some((authorization) => authorization.requestKind === requestKind);

  const confirmOperation = async () => {
    if (!operation) return;
    try {
      const payload = { confirmed: true as const, email };
      let outcome: "completed" | "failed" | "rejected";
      if (operation === "access") ({ outcome } = await access.mutateAsync(payload));
      else if (operation === "export") {
        const result = await exportData.mutateAsync(payload);
        ({ outcome } = result);
        if (result.data) downloadJson(result.data, email);
      } else if (operation === "rectification") ({ outcome } = await rectify.mutateAsync({ ...payload, firstName }));
      else if (operation === "unsubscription") ({ outcome } = await unsubscribe.mutateAsync(payload));
      else if (operation === "objection") ({ outcome } = await object.mutateAsync(payload));
      else if (operation === "suppressionRemoval") ({ outcome } = await removeSuppression.mutateAsync(payload));
      else ({ outcome } = await erase.mutateAsync(payload));

      if (outcome === "completed") toast.success("Opération enregistrée.");
      else toast.error("L’opération a été rejetée.");
      setOperation(undefined);
    } catch {
      toast.error("L’opération a échoué. Aucun résultat n’a été confirmé.");
    }
  };

  return (
    <PrivacySection title="Opérations confirmées">
      <p className="mb-4 text-muted-foreground text-sm">
        Chaque opération exige une vérification correspondante, indépendante, confirmée et à usage unique.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <OperationButton
          disabled={!isAuthorized("access")}
          label={OPERATION_LABELS.access}
          onClick={() => {
            setOperation("access");
          }}
        />
        <OperationButton
          disabled={!isAuthorized("export")}
          label={OPERATION_LABELS.export}
          onClick={() => {
            setOperation("export");
          }}
        />
        <div className="flex gap-2">
          <Input
            aria-label="Nouveau prénom"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
            }}
          />
          <OperationButton
            disabled={!isAuthorized("rectification")}
            label={OPERATION_LABELS.rectification}
            onClick={() => {
              setOperation("rectification");
            }}
          />
        </div>
        <OperationButton
          disabled={!isAuthorized("unsubscription")}
          label={OPERATION_LABELS.unsubscription}
          onClick={() => {
            setOperation("unsubscription");
          }}
        />
        <OperationButton
          disabled={!isAuthorized("objection")}
          label={OPERATION_LABELS.objection}
          onClick={() => {
            setOperation("objection");
          }}
        />
        <OperationButton
          disabled={!isAuthorized("suppressionRemoval")}
          label={OPERATION_LABELS.suppressionRemoval}
          onClick={() => {
            setOperation("suppressionRemoval");
          }}
        />
        <OperationButton
          destructive
          disabled={!isAuthorized("erasure")}
          label={OPERATION_LABELS.erasure}
          onClick={() => {
            setOperation("erasure");
          }}
        />
      </div>

      <Dialog
        open={operation !== undefined}
        onOpenChange={(open) => {
          if (!open) setOperation(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l’opération</DialogTitle>
            <DialogDescription>
              {operation ? OPERATION_LABELS[operation] : "Opération"} pour {email}. Cette confirmation sera auditée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              disabled={isPending}
              variant={operation === "erasure" ? "destructive" : "default"}
              onClick={() => void confirmOperation()}
            >
              {isPending ? "Traitement…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PrivacySection>
  );
}

function PrivacySection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Item variant="outline">
      <ItemHeader>
        <ItemTitle>{title}</ItemTitle>
      </ItemHeader>
      <ItemContent className="basis-full">{children}</ItemContent>
    </Item>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 break-all text-sm">{value}</dd>
    </div>
  );
}

function OperationButton({
  destructive = false,
  disabled = false,
  label,
  onClick,
}: {
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button disabled={disabled} type="button" variant={destructive ? "destructive" : "outline"} onClick={onClick}>
      {label}
    </Button>
  );
}

function downloadJson(data: unknown, email: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.download = `donnees-${email}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
