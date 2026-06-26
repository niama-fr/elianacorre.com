# Eliana Corré Platform

This context covers the people, offers, and access rights managed by the Eliana Corré website and its future content platform.

## Language

**Contact Request**:
A message deliberately submitted through the site's contact form for a direct response. It does not create newsletter consent, e-book access, or an authenticated account even when the same email address appears elsewhere.
_Avoid_: Newsletter subscription, subscriber

**Newsletter Subscriber**:
A person whose single canonical newsletter email address has been confirmed for receiving the monthly newsletter. Addresses are trimmed and compared case-insensitively without provider-specific rewriting of dots or `+tags`, while the submitted spelling remains available for display and evidence. Only that email address is required; an optional first name may be retained for personalization. A newsletter subscriber does not necessarily have an authenticated account.
_Avoid_: User, member, account

**Former Newsletter Subscriber**:
A person whose newsletter consent has ended without an erasure request. Identifying data and welcome e-book access are retained for no more than three years after unsubscription or the last relevant contact, unless another active relationship provides a separate legal basis; expiry occurs without a re-engagement email.
_Avoid_: Active subscriber

**Account**:
An authenticated identity used to access purchased or subscription-only content. An account may be linked to an existing newsletter subscriber only after the identity provider or an additional confirmation verifies ownership of the same email address; linking never changes newsletter consent.
_Avoid_: Newsletter subscriber

**Content Administrator**:
An operator whose Google Workspace email address is explicitly authorized in Convex to manage published platform content and subscriber privacy requests. Membership of the Workspace domain alone does not grant access, and this administrative identity is separate from newsletter subscription and future customer access.
_Avoid_: Subscriber, customer account

**Newsletter Consent**:
The explicit, revocable permission given by a person to receive the newsletter. It can be confirmed only by the person through the confirmation flow, never created administratively. A person may have multiple consent periods after unsubscribing and later confirming again; the history records each request, confirmation, immutable versions of the wording and privacy notice presented, subscription placement, and withdrawal rather than only the current subscription state.
_Avoid_: Account creation, email verification

**Pending Subscription**:
A newsletter request whose email address has not yet been confirmed. Its identifying data expires after 30 days and does not grant newsletter delivery or welcome e-book access.
_Avoid_: Newsletter subscriber

**Subscription Placement**:
The first-party location where a newsletter request was submitted, such as the home page, site footer, or dedicated subscription page. It supports consent evidence and aggregate journey measurement without advertising tracking.
_Avoid_: Advertising attribution

**Delivery Eligibility**:
Whether email may currently be sent to a consenting person. A permanent bounce or spam complaint makes the address ineligible independently of consent; a spam complaint requires a new explicit confirmation before eligibility can be restored.
_Avoid_: Newsletter consent

**Delivery Attempt**:
A short-lived operational record of an email or download attempt used for diagnosis and retry. Detailed attempt data is retained for 90 days, while only the resulting business event remains in longer-lived consent, delivery eligibility, or e-book history.
_Avoid_: Consent evidence

**Welcome E-book Access**:
The continuing right granted after email confirmation to obtain the current version of the free e-book. A personal 72-hour download is offered immediately on the confirmation success page and sent by email; the right to request a replacement link does not expire and is not revoked by newsletter unsubscription. Each delivery records which version was provided, while a verified request to erase the person's identifying data also erases this right.
_Avoid_: Permanent download link, account entitlement

**Suppression Record**:
The minimal non-marketing record retained to prevent email delivery after a person objects to future prospecting. It is separate from the subscriber profile and cannot be used to identify or contact the person for another purpose; a public subscription attempt cannot remove it, and lifting the objection requires a verified privacy request.
_Avoid_: Newsletter subscriber, active contact

**Privacy Request**:
A verified request received through `confidentialite@elianacorre.com` to access, rectify, export, restrict, object to, or erase a person's data. Its handling is recorded separately from newsletter consent and marketing activity.
_Avoid_: Unsubscription
