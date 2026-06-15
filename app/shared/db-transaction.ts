import type { Sql, TransactionSql } from "postgres";

/** Cast a postgres transaction handle to the Sql interface used by SQLC helpers. */
export const asSqlTransaction = (tx: TransactionSql): Sql => tx as unknown as Sql;
