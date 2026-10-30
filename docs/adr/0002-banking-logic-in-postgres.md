# Banking Logic in PostgreSQL Procedures and Triggers

This is a DBMS lab project, so the banking rules (balance changes, loan cycles, credit score, audit) live in PostgreSQL as stored procedures, triggers, functions and views, kept in plain `.sql` files. Express only authenticates the caller and invokes them. Drizzle and the Neon HTTP driver are replaced by `pg`, because procedures and triggers can't be managed by `drizzle-kit push` and `pg` works with both Neon and local Postgres. Each procedure runs atomically, so balance updates and ledger inserts never diverge.
