# @repo/db

Shared Postgres helpers for server-side workflows.

## Exported API

- `withPgTransaction(fn)`
- `writeJobSearchBatch({ teamId, agentRunId, jobSources, jobs, rankings })`

## Environment

- `DATABASE_URL`

## Notes

- Uses parameterized queries.
- Includes a fallback execution path for lightweight test databases (e.g. pg-mem).

## Tests

```bash
pnpm -C packages/db test
```
