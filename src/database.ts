import { Kysely, sql, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';
import { Database, Task, TaskStatus, TaskTable } from './types.database';
import { sqlCurrentTimestamp } from './consts';

export async function initDb(params: {
  path: string;
}): Promise<Kysely<Database>> {
  const dialect = new SqliteDialect({
    database: new SQLite(params.path),
  });
  const db = new Kysely<Database>({
    dialect,
  });

  const defaultStatus: TaskStatus = 'pending';

  await db.schema
    .createTable('tasks')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('key', 'text', (col) => col.notNull())
    .addColumn('value', 'text')
    .addColumn('status', 'text', (col) => col.defaultTo(defaultStatus))
    .addColumn('processed_at', 'datetime')
    .addColumn('completed_at', 'datetime')
    .addColumn('failed_at', 'datetime')
    .addColumn('queued_at', 'datetime', (col) =>
      col.defaultTo(sqlCurrentTimestamp)
    )
    .addColumn('created_at', 'datetime', (col) =>
      col.defaultTo(sqlCurrentTimestamp)
    )
    .execute();

  await db.schema
    .createIndex('idx_key')
    .on('tasks')
    .columns(['key'])
    .unique()
    .ifNotExists()
    .execute();

  await db.schema
    .createIndex('idx_status')
    .on('tasks')
    .columns(['status'])
    .ifNotExists()
    .execute();

  await db.schema
    .createIndex('idx_queued_at')
    .on('tasks')
    .columns(['queued_at'])
    .ifNotExists()
    .execute();

  return db;
}
