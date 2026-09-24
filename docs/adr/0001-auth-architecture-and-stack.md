# Express Backend and Next.js Auth Architecture

We need an authentication subsystem for bank management supporting login and registration against NeonDB. We decided to place an Express TypeScript service in `apps/server` with Drizzle ORM and use HTTP-only JWT cookies proxied through Next.js rewrites, because this decouples the API while eliminating cross-origin cookie issues and keeping type safety throughout the Turborepo.
