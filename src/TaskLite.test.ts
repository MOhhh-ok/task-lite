import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskLite } from './TaskLite';
import { Database, Task } from './types.database';

describe('TaskLite', () => {
  let taskLite: TaskLite;

  beforeEach(async () => {
    taskLite = await TaskLite.create({ path: ':memory:' });
  });

  describe('enqueue', () => {
    it('タスクを追加できること', async () => {
      const task = { key: 'test-key', value: 'test-value' };
      await taskLite.enqueueOrThrow(task);

      const db = taskLite.getDb();
      const result = await db
        .selectFrom('tasks')
        .selectAll()
        .where('key', '=', task.key)
        .executeTakeFirst();

      expect(result).toMatchObject({
        key: task.key,
        value: task.value,
        status: 'pending',
      });
    });

    it('upsertオプションで既存のタスクを更新できること', async () => {
      const task = { key: 'test-key', value: 'test-value' };
      await taskLite.enqueueOrThrow(task);
      await taskLite.enqueueOrUpdate({
        key: task.key,
        value: 'updated-value',
      });

      const db = taskLite.getDb();
      const results = await db
        .selectFrom('tasks')
        .selectAll()
        .where('key', '=', task.key)
        .execute();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        key: task.key,
        value: 'updated-value',
        status: 'pending',
      });
    });
  });

  describe('process', () => {
    it('タスクを処理できること', async () => {
      const task = { key: 'test-key', value: 'test-value' };
      await taskLite.enqueueOrThrow(task);

      const callback = vi.fn();
      const processed = await taskLite.processMany(callback, {});

      expect(processed).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);

      const db = taskLite.getDb();
      const result = await db
        .selectFrom('tasks')
        .selectAll()
        .where('key', '=', task.key)
        .executeTakeFirst();

      expect(result).toBeUndefined(); // デフォルトでは処理後にタスクは削除される
    });

    it('keepAfterProcessオプションでタスクを保持できること', async () => {
      const task = { key: 'test-key', value: 'test-value' };
      await taskLite.enqueueOrThrow(task);

      const callback = vi.fn();
      await taskLite.processMany(callback, { keepAfterProcess: true });

      const db = taskLite.getDb();
      const result = await db
        .selectFrom('tasks')
        .selectAll()
        .where('key', '=', task.key)
        .executeTakeFirst();

      expect(result).toMatchObject({
        key: task.key,
        value: task.value,
        status: 'completed',
      });
    });
  });

  describe('removeByStatus', () => {
    it('指定したステータスのタスクを削除できること', async () => {
      const task1 = { key: 'test-1', value: 'value-1' };
      const task2 = { key: 'test-2', value: 'value-2' };

      await taskLite.enqueueOrThrow(task1);
      await taskLite.enqueueOrThrow(task2);
      await taskLite.processMany(vi.fn(), { keepAfterProcess: true });

      await taskLite.remove({ and: { statuses: ['completed'] } });

      const db = taskLite.getDb();
      const results = await db.selectFrom('tasks').selectAll().execute();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('pending');
    });
  });
});

describe('remove', () => {
  let tasklite: TaskLite;

  beforeEach(async () => {
    tasklite = await TaskLite.create({ path: ':memory:', logLevels: ['sql'] });
  });

  it('指定したIDのタスクを削除する', async () => {
    // タスクを作成
    await tasklite.enqueueOrThrow({ key: 'test1', value: 'value1' });
    await tasklite.enqueueOrThrow({ key: 'test2', value: 'value2' });
    const task = await tasklite
      .getDb()
      .selectFrom('tasks')
      .selectAll()
      .executeTakeFirst();

    // タスクを削除
    await tasklite.remove({ and: { id: task!.id } });

    // タスクが削除されたことを確認
    const result = await tasklite
      .getDb()
      .selectFrom('tasks')
      .selectAll()
      .execute();
    expect(result).toHaveLength(1);
  });

  it('指定したステータスのタスクを削除する', async () => {
    // 異なるステータスのタスクを作成
    await tasklite.enqueueOrThrow({ key: 'test1', value: 'value1' });
    await tasklite.enqueueOrThrow({ key: 'test2', value: 'value2' });
    await tasklite
      .getDb()
      .updateTable('tasks')
      .where('key', '=', 'test2')
      .set({ status: 'completed' })
      .execute();

    // completedステータスのタスクを削除
    await tasklite.remove({ and: { statuses: ['completed'] } });

    // pendingのタスクのみが残っていることを確認
    const results = await tasklite
      .getDb()
      .selectFrom('tasks')
      .selectAll()
      .execute();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('pending');
  });

  it('指定した日時より前のタスクを削除する', async () => {
    // 異なる時間のタスクを作成
    const oldDate = new Date('2024-01-01');
    const newDate = new Date('2024-01-02');

    await tasklite.enqueueOrThrow({ key: 'test1', value: 'value1' });
    await tasklite
      .getDb()
      .updateTable('tasks')
      .where('key', '=', 'test1')
      .set({ queued_at: oldDate.toISOString() })
      .execute();

    await tasklite.enqueueOrThrow({ key: 'test2', value: 'value2' });
    await tasklite
      .getDb()
      .updateTable('tasks')
      .where('key', '=', 'test2')
      .set({ queued_at: newDate.toISOString() })
      .execute();

    // 古い日付のタスクを削除
    await tasklite.remove({ and: { queuedBefore: newDate } });

    // 新しい日付のタスクのみが残っていることを確認
    const results = await tasklite
      .getDb()
      .selectFrom('tasks')
      .selectAll()
      .execute();
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('test2');
  });
});
