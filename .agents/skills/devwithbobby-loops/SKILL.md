---
name: devwithbobby-loops
description: Integrate with Loops.so email marketing platform. Send transactional emails, manage contacts, trigger loops, and monitor email operations with built-in spam detection and rate limiting. Use this skill whenever working with Loops or related Convex component functionality.
---

# Loops

## Instructions

Integrates Convex applications with Loops.so for email marketing operations including transactional emails, contact management, and automated workflows. Provides TypeScript-safe APIs for all Loops.so endpoints with built-in monitoring, spam detection, and rate limiting to prevent abuse. All email operations are automatically logged to Convex tables for analytics and compliance tracking.

### Installation

```bash
npm install @devwithbobby/loops
```

## Use cases

- **User onboarding flows** - Send welcome emails and trigger automated onboarding sequences when users sign up or complete profile steps
- **Transactional email delivery** - Send order confirmations, password resets, and notifications using Loops.so templates with dynamic data variables
- **Contact lifecycle management** - Sync user data to Loops.so, update subscriber preferences, and manage unsubscribes as users interact with your app
- **Event-driven email campaigns** - Trigger targeted email workflows based on user actions like purchases, feature usage, or subscription changes
- **Email abuse prevention** - Monitor sending patterns and enforce rate limits to detect spam, prevent API quota exhaustion, and maintain sender reputation

## How it works

The component mounts to your Convex app via `convex.config.ts` and requires a `LOOPS_API_KEY` environment variable for authentication. It exposes a `Loops` client class that wraps all Loops.so API endpoints as Convex actions, including contact management (`addContact`, `updateContact`, `findContact`), email sending (`sendTransactional`, `sendEvent`, `triggerLoop`), and batch operations.

All email operations are automatically logged to an `emailOperations` table with timestamps, recipient details, and operation metadata. This enables built-in monitoring through functions like `getEmailStats` and spam detection via `detectRecipientSpam` and `detectRapidFirePatterns`. Rate limiting is implemented through queries that check sending frequency against configurable thresholds.

The component provides both individual function access and an `api()` helper that exports all functions at once. Since these are Convex actions calling external APIs, they require proper authentication wrapping in production. The client handles all Loops.so API specifics including request formatting, error handling, and response parsing with full TypeScript support.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Loops is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40devwithbobby%2Floops)
- [GitHub repository](https://github.com/robertalv/loops)
- [Live demo](loops, loops.so, email, email-marketing)
- [Convex Components Directory](https://www.convex.dev/components/devwithbobby/loops)
- [Convex documentation](https://docs.convex.dev)