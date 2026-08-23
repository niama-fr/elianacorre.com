import { SystemFields } from "@confect/core";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S, SchemaTransformation as ST } from "effect";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const kinds = ["email.hardBounced", "email.resubscribed", "email.spamReported", "email.unsubscribed"] as const;

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sLoopsWebhookKind = S.Literals(kinds);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sLoopsWebhookFields = S.Struct({
  email: sCanonicalEmail,
  kind: sLoopsWebhookKind,
  messageId: S.String,
  occurredAt: S.Finite,
  webhookId: S.String,
});

export const sLoopsWebhookDoc = sLoopsWebhookFields.pipe(S.fieldsAssign(SystemFields.SystemFields("loopsWebhooks").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sLoopsWebhookCreate = sLoopsWebhookFields;

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const sLoopsWebhookValues = S.Struct({
  contactIdentity: S.Struct({ email: sCanonicalEmail }),
  email: S.Struct({ id: S.String }),
  eventName: sLoopsWebhookKind,
  eventTime: S.Finite,
  webhookId: S.String,
  webhookSchemaVersion: S.Literal("1.0.0"),
}).pipe(
  S.decodeTo(
    S.Struct({ email: sCanonicalEmail, kind: sLoopsWebhookKind, messageId: S.String, occurredAt: S.Finite, webhookId: S.String }),
    ST.transform({
      decode: ({ contactIdentity: { email }, email: { id: messageId }, eventName: kind, eventTime, webhookId }) => ({
        email,
        kind,
        messageId,
        occurredAt: eventTime * 1000,
        webhookId,
      }),
      encode: ({ email, kind, messageId, occurredAt, webhookId }) => ({
        contactIdentity: { email },
        email: { id: messageId },
        eventName: kind,
        eventTime: occurredAt / 1000,
        webhookId,
        webhookSchemaVersion: "1.0.0" as const,
      }),
    })
  )
);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LoopsWebhooks = {
  Create: typeof sLoopsWebhookCreate.Type;
  Doc: typeof sLoopsWebhookDoc.Type;
  Fields: typeof sLoopsWebhookFields.Type;
  Kind: typeof sLoopsWebhookKind.Type;
  Values: typeof sLoopsWebhookValues.Type;
};
