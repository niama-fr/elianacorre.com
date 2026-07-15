# Privacy-request identity verification

## Outcome

This procedure lets an authorized Content Administrator verify that a person making a Privacy Request controls the subscriber identity concerned before any data is disclosed or changed. It minimizes additional personal-data collection and does not decide whether a request is legally valid or may be refused.

## Prerequisites

- The request was received at `confidentialite@elianacorre.com`.
- The operator is signed in with a Google Workspace Account explicitly authorized as a Content Administrator in Convex.
- The request identifies one canonical email address: trimmed and lowercase, without provider-specific rewriting of dots or `+tags`.
- The production administration area and its privacy-operation audit history are available.

Only authorized Content Administrators may perform this procedure. Access to the Google Workspace domain or mailbox alone is insufficient.

## Canonical systems

| Information                                                                    | Canonical system                          |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Request correspondence and temporary verification material                     | `confidentialite@elianacorre.com` mailbox |
| Request type, verification outcome, administrator, time, and operation outcome | Convex privacy-operation audit history    |
| Subscriber, consent, delivery, e-book, and suppression state                   | Convex                                    |
| Delivery-provider projection                                                   | Loops, reconciled from Convex             |
| Actionable follow-up work                                                      | Linear                                    |

Do not copy identity documents, mailbox contents, or exported subscriber data into Linear, GitHub, repository files, Obsidian, application logs, or general chat systems.

## Verification standard

Use the least intrusive method that provides sufficient confidence for the operation. Do not request an identity document by default. CNIL guidance permits additional identity information only when there is reasonable doubt and recommends adapting the verification level to the request, the sensitivity of the information, and the context.

Control of the canonical subscriber email is normally sufficient when all of the following are true:

1. the request originates from that address;
2. the administrator sends a fresh, single-use verification message to that same address rather than merely replying to a forwarded message;
3. the requester completes the verification from that mailbox;
4. there is no reasonable doubt, contradiction, suspected compromise, third-party data, or request for delivery to another address.

An existing newsletter confirmation link, e-book download link, forwarded message, knowledge of a first name, or knowledge of prior newsletter activity is not identity verification.

Apply stronger verification when there is reasonable doubt. Ask first for the smallest additional fact already held by the service and reasonably known to the requester. Request an identity document only as a last resort when necessary and proportionate. Do not collect an official identifier that the service cannot meaningfully compare with existing information.

Requests made by a representative require a mandate identifying the requester, representative, rights concerned, duration, and intended recipient of the response. Verify both the mandate and the identities proportionately. Escalate requests involving minors, protected adults, disputed authority, or legal uncertainty to Grégory before any disclosure or mutation.

## Manual procedure

1. Record the receipt date and requested operation without copying the request body into the application audit history.
2. Normalize the claimed email address using the canonical-email rule. Do not search by approximate name or enumerate similar addresses.
3. Confirm that the requester can receive a fresh single-use verification message at the canonical address.
4. Review for reasonable doubt: inconsistent addresses, a requested response to another destination, suspected mailbox compromise, a representative, third-party information, contradictory claims, or an unusually sensitive or destructive request.
5. If there is no reasonable doubt, record the verification method as `emailChallenge` and its success or failure. Do not retain the token or message content.
6. If doubt remains, pause all disclosure and mutation. Ask for the minimum additional evidence needed, explain why it is required, and record only `additionalEvidence` plus the outcome.
7. If an identity document is exceptionally necessary, tell the requester which visible fields are required and invite them to mask unrelated fields. Keep the document only in the restricted mailbox while verification is pending.
8. Record the verification result in Convex: authorized administrator, time, request type, verification method category, and outcome. Do not record tokens, document numbers, copies, or unnecessary request content.
9. Delete temporary verification evidence and mailbox attachments as soon as the verification decision is recorded. Retain only ordinary correspondence needed to manage the request under the approved mailbox-retention policy.
10. Perform each requested privacy operation separately in the administration area. Reconfirm destructive operations. Never use verification to create Newsletter Consent or silently restore eligibility after a complaint.
11. Send access or export results only to the verified destination using the approved secure delivery mechanism. Review the result first and remove or mask third-party data.
12. Inform the requester of the outcome. Escalate any proposed refusal, deadline extension, or unresolved legal question to Grégory; this runbook does not authorize those decisions.

## Expected results

- A verified request has one auditable verification outcome without stored verification secrets or identity-document contents.
- An unverified or doubtful request causes no disclosure, rectification, suppression removal, or erasure.
- Every subsequent operation remains separate, confirmed, and attributable to the authorized administrator.
- Temporary verification evidence is deleted after the verification decision.

## Verification

For a synthetic test identity:

1. Complete a canonical-email challenge and confirm the audit records only the administrator, time, request type, method category, and outcome.
2. Attempt the same operation as an unauthorized identity and confirm no subscriber data is exposed.
3. Fail or abandon a challenge and confirm no data or state changes occur.
4. Introduce a destination-address mismatch and confirm the operation pauses for additional verification.
5. Confirm neither the challenge token nor request content appears in Convex logs, audit history, Linear, or application logs.
6. Confirm temporary evidence can be deleted without removing the minimal operation audit.

## Recovery and rollback

- If verification is interrupted, leave the request unverified and restart with a fresh single-use challenge. Never reuse a token.
- If evidence was sent to an unauthorized location, stop processing, remove access where possible, preserve only the minimum incident evidence, and notify Grégory for incident assessment.
- If an operation was performed for the wrong identity, stop further operations and notify Grégory immediately. Do not improvise a reversal: erasure and provider reconciliation may be irreversible.
- If the administration area or audit history is unavailable, perform no direct database edit. Record the operational blocker in Linear without personal data.

## Security boundaries

- Never paste production subscriber data, request correspondence, verification tokens, identity documents, or exports into source control, Linear, GitHub, Obsidian, logs, or AI prompts.
- Never ask for passwords, mailbox credentials, full payment details, or unrelated identity information.
- Never send an export to a newly supplied address solely because the requester asks.
- Never retain a copy of an identity document after the verification decision.
- Never use Loops as the authority for identity, consent, or privacy-operation state.

## Automation mapping

The administration area may automate canonical-email normalization, single-use challenges, authorization checks, audit fields, confirmations, export generation, and Convex-to-Loops reconciliation. The human equivalent is to verify mailbox control, assess reasonable doubt, choose proportionate evidence, review third-party data, approve each separate operation, and delete temporary evidence. Automation must not decide legal refusals or manufacture consent.

## Maintenance

Grégory owns approval of this procedure. Update it whenever the privacy administration flow, identity provider, mailbox handling, audit schema, secure export mechanism, or applicable CNIL guidance changes. Review it before production launch and after any privacy or identity-verification incident.

## References

- [CNIL — Professionnels : comment répondre à une demande de droit d’accès ?](https://www.cnil.fr/fr/repondre-une-demande-de-droit-dacces)
- [CNIL — Dois-je fournir obligatoirement une copie de ma carte d’identité ?](https://www.cnil.fr/fr/cnil-direct/question/exercice-de-mes-droits-informatique-et-libertes-dois-je-fournir-obligatoirement)
- [CNIL — Questions-réponses sur l’exercice des droits par un mandat](https://www.cnil.fr/fr/les-questions-reponses-de-la-cnil-sur-la-recommandation-sur-lexercice-des-droits-par-un-mandat)
