import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskLite } from './TaskLite';
import { Database, Task } from './types';

describe('TaskLite', () => {
  let taskLite: TaskLite;

  beforeEach(async () => {
    taskLite = await TaskLite.create({ path: ':memory:' });
  });

  describe('enqueue', () => {
    it('タスクを追加できること', async () => {
      const task = { key: 'test-key', value: 'test-value' };
      await taskLite.enqueue(task);

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
      await taskLite.enqueue(task);
      await taskLite.enqueue(
        { key: task.key, value: 'updated-value' },
        { upsert: true }
      );

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
      await taskLite.enqueue(task);

      const callback = vi.fn();
      const processed = await taskLite.process(callback, {});

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
      await taskLite.enqueue(task);

      const callback = vi.fn();
      await taskLite.process(callback, { keepAfterProcess: true });

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

      await taskLite.enqueue(task1);
      await taskLite.enqueue(task2);
      await taskLite.process(vi.fn(), { keepAfterProcess: true });

      await taskLite.removeByStatus({ statuses: ['completed'] });

      const db = taskLite.getDb();
      const results = await db.selectFrom('tasks').selectAll().execute();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('pending');
    });
  });
});
