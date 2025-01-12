import { InsertResult, Kysely } from 'kysely';
import * as R from 'remeda';
import { initDb } from './database';
import { Database, NewTask, Task, TaskStatus, TaskUpdate } from './types';

type LogLevel = 'sql';

export class TaskLite {
  private constructor(
    private db: Kysely<Database>,
    private logLevels: LogLevel[] = []
  ) {}

  static async create(params: { path: string; logLevels?: LogLevel[] }) {
    const db = await initDb(params);
    return new TaskLite(db, params.logLevels);
  }

  getDb() {
    return this.db;
  }

  async enqueue(
    data: Pick<NewTask, 'key' | 'value'>,
    ops?: { upsert?: boolean }
  ): Promise<InsertResult[]> {
    const newData = R.pick(data, ['key', 'value']);
    const updateData: TaskUpdate = {
      ...newData,
      status: 'pending',
      queued_at: new Date().toISOString(),
    };
    if (ops?.upsert) {
      const query = this.db
        .insertInto('tasks')
        .values(newData)
        .onConflict((oc) => oc.column('key').doUpdateSet(updateData));
      this.logSql(query);
      return query.execute();
    } else {
      const query = this.db.insertInto('tasks').values(newData);
      this.logSql(query);
      return query.execute();
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
      const query = this.db.deleteFrom('tasks').where('id', '=', task.id);
      this.logSql(query);
      await query.execute();
    } else {
      await this.setAsCompleted(task.id);
    }
    return true;
  }

  async remove(params: {
    and: {
      id?: number;
      statuses?: TaskStatus[];
      queuedBefore?: Date;
    };
  }) {
    const { id, statuses, queuedBefore } = params.and;
    let query = this.db.deleteFrom('tasks');
    if (id) query = query.where('id', '=', id);
    if (statuses) query = query.where('status', 'in', statuses);
    if (queuedBefore)
      query = query.where('queued_at', '<', queuedBefore.toISOString());
    this.logSql(query);
    await query.execute();
  }

  async removeByStatus(params: { statuses: TaskStatus[] }) {
    const query = this.db
      .deleteFrom('tasks')
      .where('status', 'in', params.statuses);
    this.logSql(query);
    await query.execute();
  }

  async removeByQueuedAt(params: { queuedAt: Date }) {
    const query = this.db
      .deleteFrom('tasks')
      .where('queued_at', '<=', params.queuedAt.toISOString());
    this.logSql(query);
    await query.execute();
  }

  private async getNextQueueTask(params: { statuses: TaskStatus[] }) {
    const query = this.db
      .selectFrom('tasks')
      .selectAll()
      .orderBy('queued_at')
      .where('status', 'in', params.statuses);
    this.logSql(query);
    return await query.executeTakeFirst();
  }

  private async setAsProcessing(id: number) {
    const query = this.db.updateTable('tasks').where('id', '=', id).set({
      status: 'processing',
      processed_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
    });
    this.logSql(query);
    await query.execute();
  }

  private async setAsCompleted(id: number) {
    const query = this.db.updateTable('tasks').where('id', '=', id).set({
      status: 'completed',
      completed_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
    });
    this.logSql(query);
    await query.execute();
  }

  private async setAsFailed(id: number) {
    const query = this.db.updateTable('tasks').where('id', '=', id).set({
      status: 'failed',
      failed_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
    });
    this.logSql(query);
    await query.execute();
  }

  private logSql(query: any) {
    if (!this.logLevels.includes('sql')) return;
    console.log(query.compile().sql);
    console.log(query.compile().parameters);
  }
}
