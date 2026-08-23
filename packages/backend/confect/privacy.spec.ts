import { FunctionSpec, GroupSpec } from "@confect/core";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sEbookIssuanceDto } from "@ec/domain/schemas/ebook-issuances";
import { sNewsRestrictionDoc } from "@ec/domain/schemas/news-restrictions";
import { sNewsSubscriptionDoc } from "@ec/domain/schemas/news-subscriptions";
import {
  sPrivacyAuditEntry,
  sPrivacyAuditOutcome,
  sPrivacyAuditRequestKind,
  sPrivacyAuditVerificationCreate,
} from "@ec/domain/schemas/privacy-audits";
import { sProfile } from "@ec/domain/schemas/profiles";
import { sCanonicalEmail, sConfirmedEmailPayload, sOptionalTrim } from "@ec/domain/schemas/utils";
import { Schema as S, Struct } from "effect";

import { Id } from "./_generated/id";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sOutcomeResult = S.Struct({ outcome: S.Literals(["completed", "rejected"]) });

export const sPrivacySubject = S.Struct({
  deliveryEligibility: S.Struct({
    eligible: S.Boolean,
    restriction: S.NullOr(sNewsRestrictionDoc),
    status: S.Literals(["eligible", "notConsenting", "restricted", "suppressed"]),
  }),
  newsletterConsent: S.Struct({
    periods: S.Array(sNewsSubscriptionDoc),
  }),
  privacyState: S.Struct({
    audits: S.Array(sPrivacyAuditEntry),
    grants: S.Array(
      S.Struct({
        expiresAt: S.Int,
        requestKind: sPrivacyAuditRequestKind,
      })
    ),
    suppressed: S.Boolean,
  }),
  profile: S.NullOr(sProfile),
  welcomeEbookAccess: S.Struct({
    issuances: S.Array(sEbookIssuanceDto),
  }),
});

export const sPrivacySubjectReturn = S.NullOr(sPrivacySubject);

export const sPrivacyDataRequestReturn = S.Struct({
  data: S.NullOr(sPrivacySubject),
  outcome: sPrivacyAuditOutcome,
});

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES --------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({ email: sCanonicalEmail }),
      error: () => sAuthError,
      name: "inspectSubject",
      returns: () => sPrivacySubjectReturn,
    })
  )

  // MUTATIONS ------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload,
      error: () => sAuthError,
      name: "fulfillAccessRequest",
      returns: () => sPrivacyDataRequestReturn,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload,
      error: () => sAuthError,
      name: "fulfillErasureRequest",
      returns: () => sOutcomeResult,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload,
      error: () => sAuthError,
      name: "fulfillExportRequest",
      returns: () => sPrivacyDataRequestReturn,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload,
      error: () => sAuthError,
      name: "fulfillObjectionRequest",
      returns: () => sOutcomeResult,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload.pipe(S.fieldsAssign({ firstName: sOptionalTrim })),
      error: () => sAuthError,
      name: "fulfillRectificationRequest",
      returns: () => sOutcomeResult,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload,
      error: () => sAuthError,
      name: "fulfillSuppressionRemovalRequest",
      returns: () => sOutcomeResult,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmedEmailPayload,
      error: () => sAuthError,
      name: "fulfillUnsubscriptionRequest",
      returns: () => sOutcomeResult,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sPrivacyAuditVerificationCreate.mapFields(Struct.omit(["performedBy"])),
      error: () => sAuthError,
      name: "recordVerification",
      returns: () => sOutcomeResult,
    })
  )

  // INTERNAL MUTATIONS ---------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({ privacyGrantId: Id("privacyGrants") }),
      name: "expireGrant",
      returns: () => S.Null,
    })
  );
