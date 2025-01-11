import sqlite3 from 'sqlite3';

export async function initDb(params: {
  path: string;
}): Promise<sqlite3.Database> {
  const db = new sqlite3.Database(params.path);

  // Promiseでラップして非同期処理に対応
  await new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          key TEXT NOT NULL,
          data TEXT DEFAULT '{}',
          status TEXT DEFAULT 'pending',
          started_at DATETIME,
          completed_at DATETIME,
          queue_order DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      )
        .run(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_category_key ON tasks(category, key)'
        )
        .run('CREATE INDEX IF NOT EXISTS idx_status ON tasks(status)')
        .run(
          'CREATE INDEX IF NOT EXISTS idx_queue_order ON tasks(queue_order)',
          (err) => {
            if (err) reject(err);
            resolve();
          }
        );
    });
  });
  return db;
}
