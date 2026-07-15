# Eliana Corré Platform

This context covers the people, offers, and access rights managed by the Eliana Corré website and its future content platform.

## Language

**Profile**: A person known to the platform through one normalized email address and the authoritative source for that person's platform identity fields and role. A Profile has a highest platform role: `contact` for a person without member or administrative access, `member` for a person with qualifying membership or course access, and `admin` for a content administrator. A Profile may exist without an authenticated Account; newsletter activity never demotes an existing role. _Avoid_: User, Account

**Contact Request**: A message deliberately submitted through the site's contact form for a direct response. It belongs to the same Profile used for any other relationship with that email address, but does not create newsletter consent, e-book access, or an authenticated Account. _Avoid_: Newsletter subscription, subscriber

**Newsletter Subscriber**: A Profile whose newsletter email address has been confirmed for receiving the monthly newsletter. Addresses are stored trimmed and lowercase without provider-specific rewriting of dots or `+tags`. Only that email address is required; an optional first name may be retained for personalization. A newsletter subscriber does not necessarily have an authenticated Account, and newsletter subscription does not change the Profile's role. _Avoid_: User, member, account

**Former Newsletter Subscriber**: A person whose newsletter consent has ended without an erasure request. Identifying data and welcome e-book access are retained for no more than three years after unsubscription or the last relevant contact, unless another active relationship provides a separate legal basis; expiry occurs without a re-engagement email. _Avoid_: Active subscriber

**Account**: An authenticated identity used by an administrator or member to access protected platform capabilities. An Account is managed by the active Authentication Provider and linked to one Profile; newsletter subscribers and contact-form correspondents do not receive Accounts merely because their email is known. Linking never changes newsletter consent. _Avoid_: Newsletter subscriber

**Authentication Provider**: The replaceable system responsible for authentication identities, credentials, external identity assertions, sessions, and account-recovery workflows. It receives only the Profile fields required for authentication and does not own platform roles or person identity. _Avoid_: Profile source, authorization source

**Email Provider**: The replaceable system responsible for transactional email delivery, campaign operations, and the contact projection needed for sending. It receives only delivery and campaign fields derived from authoritative Profiles, consent, and delivery eligibility; it does not own newsletter consent or person identity. _Avoid_: Consent source, Profile source

**Content Administrator**: An operator whose Google Workspace email address is explicitly authorized in Convex to manage published platform content and subscriber privacy requests. Membership of the Workspace domain alone does not grant access, and this administrative identity is separate from newsletter subscription and future customer access. _Avoid_: Subscriber, customer account

**Newsletter Consent**: The explicit, revocable permission given by a person to receive the newsletter. It can be confirmed only by the person through the confirmation flow, never created administratively. A person may have multiple consent periods after unsubscribing and later confirming again; the history records each request, confirmation, the legal wording presented, and withdrawal rather than only the current subscription state. _Avoid_: Account creation, email verification

**Legal Document**: A published or draft French legal text used to explain a newsletter-related commitment or privacy notice. Published legal documents are historical evidence and must not be changed after publication; future internationalization will be handled as a broader product decision rather than in the current legal document model. _Avoid_: Versioned copy, locale-specific copy

**Newsletter Legal Bundle**: The pair of legal documents presented together when a person requests the newsletter. The active bundle is the latest published bundle, and the confirmed request keeps the bundle that was presented at the time. _Avoid_: Current legal text, superseded legal copy

**Pending Subscription**: A newsletter request whose email address has not yet been confirmed. Its identifying data expires after 30 days and does not grant newsletter delivery or welcome e-book access. _Avoid_: Newsletter subscriber

**Newsletter Subscription**: The lifecycle record for a Profile's newsletter request and consent period. It starts with a request, may be confirmed into active newsletter consent, and may later be unsubscribed; repeated requests before confirmation rotate the confirmation capability on the same lifecycle record. _Avoid_: Separate pending request, separate consent row

**Delivery Eligibility**: Whether email may currently be sent to a consenting person. A permanent bounce or spam complaint makes the address ineligible independently of consent; a spam complaint requires a new explicit confirmation before eligibility can be restored. _Avoid_: Newsletter consent

**Loops Task**: An application-owned, short-lived record requesting a Loops contact synchronization or transactional email and recording whether it is pending, succeeded, or failed. Convex Workflow owns durable execution, retry scheduling, and interrupted-step recovery; the Loops component owns the provider API boundary and its local contact and operation projection. Detailed operational data is retained for 90 days, while only the resulting business event remains in longer-lived consent, delivery eligibility, or e-book history. _Avoid_: Consent evidence, Workflow run

**Welcome E-book Access**: The continuing right granted after email confirmation to obtain the current version of the free e-book. A personal 72-hour download is offered immediately on the confirmation success page and sent by email. Ordinary newsletter unsubscription does not immediately revoke the right: a Former Newsletter Subscriber may request replacements for three calendar years after the later of unsubscription and the most recent e-book issuance. A verified erasure request or retention expiry revokes the right. _Avoid_: Permanent download link, account entitlement

**E-book Download Capability**: A temporary bearer credential that permits its holder to download the published e-book version recorded by its issuance for 72 hours. It proves possession of a valid download link, while Welcome E-book Access determines whether the associated Profile is entitled to use it. A replacement issuance always records the current published version. _Avoid_: Newsletter capability, permanent download access

**Suppression Record**: The minimal non-marketing record retained to prevent email delivery after a person objects to future prospecting. It is separate from the subscriber profile and cannot be used to identify or contact the person for another purpose; a public subscription attempt cannot remove it, and lifting the objection requires a verified privacy request. _Avoid_: Newsletter subscriber, active contact

**Privacy Request**: A request received through `confidentialite@elianacorre.com` to access, rectify, export, restrict, object to, or erase a person's data. Its handling is recorded separately from newsletter consent and marketing activity. _Avoid_: Unsubscription

**Privacy Grant**: A temporary, single-use permission created by a successful identity-verification decision for one canonical email and one exact Privacy Request kind. It expires after 30 minutes, is consumed by the matching operation, and is separate from the immutable verification and request audits. _Avoid_: Privacy Request, Newsletter capability
