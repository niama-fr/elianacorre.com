# Replace Solid with React

## Status

Accepted.

## Context

The production application used TanStack Start for Solid. Convex and Better Auth provide individual Solid clients, but their documented TanStack Start integration is implemented and supported for React. The missing combined Solid adapter forced the application to own authentication proxy, token, and provider integration code that duplicated the supported library implementation.

Keeping Solid and React applications in the same repository would also retain two JSX toolchains, duplicate shared UI packages, and make the production application ambiguous.

## Decision

Replace the Solid applications with one React application at `apps/web`. Use TanStack Start for React, the Convex React client, and the official Convex Better Auth React Start integration.

`packages/ui` contains React UI modules. `packages/domain` and `packages/backend` remain framework-independent owners of domain schemas and Convex behavior. Remove Solid-only applications, packages, dependencies, and quality-tool configuration in the replacement pull request.

## Consequences

The repository has one JSX runtime and one production application. Authentication follows the maintained React integration rather than a local Solid adapter.

The replacement requires feature-parity review, updated deployment paths, and regression testing of public routes and authenticated dashboard routes. The previous implementation remains recoverable from Git history and the `NIA-21/solid-checkpoint` branch during migration.

## Links

- [NIA-30](https://linear.app/niama/issue/NIA-30/replace-solid-with-the-supported-react-application)
- [Convex Better Auth TanStack Start guide](https://labs.convex.dev/better-auth/framework-guides/tanstack-start)
