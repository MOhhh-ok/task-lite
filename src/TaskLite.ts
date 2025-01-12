import { Kysely } from 'kysely';
import * as R from 'remeda';
import { initDb } from './database';
import {
  Database,
  NewTask,
  Task,
  TaskStatus,
  TaskTable,
  TaskUpdate,
} from './types';

export class TaskLite {
  private db: Kysely<Database>;
  private constructor(db: Kysely<Database>) {
    this.db = db;
  }

  static async create(params: { path: string }) {
    const db = await initDb(params);
    return new TaskLite(db);
  }

  getDb() {
    return this.db;
  }

  async enqueue(
    data: Pick<NewTask, 'key' | 'value'>,
    ops?: { upsert?: boolean }
  ) {
    const newData = R.pick(data, ['key', 'value']);
    const updateData: TaskUpdate = {
      ...newData,
      status: 'pending',
      queued_at: new Date().toISOString(),
    };
    if (ops?.upsert) {
      return this.db
        .insertInto('tasks')
        .values(newData)
        .onConflict((oc) => oc.column('key').doUpdateSet(updateData))
        .execute();
    } else {
      return this.db.insertInto('tasks').values(newData).execute();
    }
  }

  async process(
    callback: (task: Task) => Promise<void>,
    ops: {
      statuses?: TaskStatus[];
      keepAfterProcess?: boolean;
    }
  ): Promise<boolean> {
    const { statuses = ['pending'], keepAfterProcess } = ops;
    const task = await this.getNextQueueTask({ statuses });
    if (!task) return false;
    await this.setAsProcessing(task.id);
    try {
      await callback(task);
    } catch (err: any) {
      await this.setAsFailed(task.id);
      throw err;
    }
    if (!keepAfterProcess) {
      await this.db.deleteFrom('tasks').where('id', '=', task.id).execute();
    } else {
      await this.setAsCompleted(task.id);
    }
    return true;
  }

  async removeByStatus(params: { statuses: TaskStatus[] }) {
    await this.db
      .deleteFrom('tasks')
      .where('status', 'in', params.statuses)
      .execute();
  }

  private async getNextQueueTask(params: { statuses: TaskStatus[] }) {
    return await this.db
      .selectFrom('tasks')
      .selectAll()
      .orderBy('queued_at')
      .where('status', 'in', params.statuses)
      .executeTakeFirst();
  }

  private async setAsProcessing(id: number) {
    await this.db
      .updateTable('tasks')
      .where('id', '=', id)
      .set({
        status: 'processing',
        processed_at: new Date().toISOString(),
        queued_at: new Date().toISOString(),
      })
      .execute();
  }

  private async setAsCompleted(id: number) {
    await this.db
      .updateTable('tasks')
      .where('id', '=', id)
      .set({
        status: 'completed',
        completed_at: new Date().toISOString(),
        queued_at: new Date().toISOString(),
      })
      .execute();
  }

  private async setAsFailed(id: number) {
    await this.db
      .updateTable('tasks')
      .where('id', '=', id)
      .set({
        status: 'failed',
        failed_at: new Date().toISOString(),
        queued_at: new Date().toISOString(),
      })
      .execute();
  }
}
