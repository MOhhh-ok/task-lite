import { Database } from 'sqlite3';
import { Task } from './types';

// ジョブを追加
export async function addTask(
  db: Database,
  params: {
    category: string;
    key: string;
    data?: any;
  }
): Promise<number> {
  const { category, key, data } = params;
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tasks (category, key, data) VALUES (?, ?, ?)`,
      [category, key, JSON.stringify(data ?? {})],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

export async function addOrUpdateTask(
  db: Database,
  params: {
    category: string;
    key: string;
    data?: any;
  }
): Promise<number> {
  const task = await findTaskByCategoryAndKey(db, params);
  if (task) {
    await updateTask(db, task.id, params);
    return task.id;
  }
  return addTask(db, params);
}

// ジョブを処理
export async function processTask(
  db: Database,
  params: {
    category: string;
    key: string;
    statuses: Task['status'][];
    process: (task: Task) => Promise<void>;
    removeAfterProcessing?: boolean;
  }
): Promise<boolean> {
  const { category, statuses, process, removeAfterProcessing } = params;
  const task = await dequeueTask(db, { category, statuses });
  if (!task) return false;
  await updateTask(db, task.id, {
    status: 'processing',
    started_at: new Date(),
  });
  await process(task);
  if (removeAfterProcessing) {
    await deleteTask(db, task.id);
  } else {
    await updateTask(db, task.id, {
      status: 'completed',
      completed_at: new Date(),
    });
  }
  return true;
}

export async function dequeueTask(
  db: Database,
  params: {
    category: string;
    statuses: Task['status'][];
  }
): Promise<Task | undefined> {
  const { category, statuses } = params;
  const statusCondition = `status IN (${statuses
    .map((status) => `'${status}'`)
    .join(',')})`;
  return new Promise((resolve, reject) => {
    db.get(
      `
        SELECT * FROM tasks
        WHERE category = ? AND ${statusCondition}
        ORDER BY queue_order LIMIT 1
      `,
      [category],
      (err, task: Task | undefined) => {
        if (err) {
          reject(err);
        }
        resolve(task);
      }
    );
  });
}

export async function findTaskByCategoryAndKey(
  db: Database,
  params: {
    category: string;
    key: string;
  }
): Promise<Task | undefined> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM tasks WHERE category = ? AND key = ?',
      [params.category, params.key],
      (err, task: Task | undefined) => {
        if (err) reject(err);
        resolve(task);
      }
    );
  });
}

export async function updateTask(
  db: Database,
  id: number,
  params: Partial<
    Pick<
      Task,
      | 'category'
      | 'key'
      | 'data'
      | 'status'
      | 'queue_order'
      | 'started_at'
      | 'completed_at'
    >
  >
) {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION');

    const updatePrefix = 'UPDATE tasks SET ';
    const updateSuffix = ' WHERE id = ?';

    try {
      // カテゴリの更新
      if (params.category) {
        db.run(updatePrefix + 'category = ?' + updateSuffix, [
          params.category,
          id,
        ]);
      }

      // キーの更新
      if (params.key) {
        db.run(updatePrefix + 'key = ?' + updateSuffix, [params.key, id]);
      }

      // データの更新
      if (params.data) {
        db.run(updatePrefix + 'data = ?' + updateSuffix, [params.data, id]);
      }

      // ステータスの更新
      if (params.status) {
        db.run(updatePrefix + 'status = ?' + updateSuffix, [params.status, id]);
      }

      // キュー順序の更新
      if (params.queue_order) {
        db.run(updatePrefix + 'queue_order = ?' + updateSuffix, [
          params.queue_order,
          id,
        ]);
      }

      // 開始日時の更新
      if (params.started_at) {
        db.run(updatePrefix + 'started_at = ?' + updateSuffix, [
          params.started_at,
          id,
        ]);
      }

      // 完了日時の更新
      if (params.completed_at) {
        db.run(updatePrefix + 'completed_at = ?' + updateSuffix, [
          params.completed_at,
          id,
        ]);
      }

      // 更新日時は常に現在時刻に設定
      db.run(updatePrefix + 'updated_at = CURRENT_TIMESTAMP' + updateSuffix, [
        id,
      ]);

      db.run('COMMIT', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    } catch (err) {
      db.run('ROLLBACK');
      reject(err);
    }
  });
}

export async function deleteTask(db: Database, id: number) {
  return new Promise((resolve, reject) =>
    db.run(`DELETE FROM tasks WHERE id = ?`, [id], (err) => {
      if (err) reject(err);
      resolve(true);
    })
  );
}
