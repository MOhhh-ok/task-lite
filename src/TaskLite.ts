import { InsertResult, Kysely } from 'kysely';
import * as R from 'remeda';
import { initDb } from './database';
import { Database, Task, TaskStatus, TaskUpdate } from './types.database';
import {
  EnqueueData,
  ProcessManyOptions,
  ProcessOptions,
  LogLevel,
} from './types.TaskLite';

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

  async enqueue(data: EnqueueData) {
    try {
      return await this.enqueueOrThrow(data);
    } catch (err: any) {}
  }

  async enqueueOrThrow(data: EnqueueData) {
    return await this._enqueue(data, { upsert: false });
  }

  async enqueueOrUpdate(data: EnqueueData) {
    return await this._enqueue(data, { upsert: true });
  }

  async process(
    callback: (task: Task) => Promise<void>,
    ops?: ProcessOptions
  ): Promise<boolean> {
    return await this.processMany(async (tasks) => callback(tasks[0]), {
      ...ops,
      limit: 1,
    });
  }

  async processMany(
    callback: (tasks: Task[]) => Promise<void>,
    ops?: ProcessManyOptions
  ): Promise<boolean> {
    const { statuses = ['pending'], keepAfterProcess, limit = 1 } = ops ?? {};
    const statuses2: TaskStatus[] =
      statuses === 'all'
        ? ['pending', 'processing', 'completed', 'failed']
        : statuses;
    const tasks = await this.getNextQueueTasks({ statuses: statuses2, limit });
    if (!tasks) return false;
    const ids = tasks.map((t) => t.id);
    await this.setAsProcessing(ids);
    try {
      await callback(tasks);
    } catch (err: any) {
      await this.setAsFailed(ids);
      throw err;
    }
    if (!keepAfterProcess) {
      const query = this.db.deleteFrom('tasks').where('id', 'in', ids);
      this.logSql(query);
      await query.execute();
    } else {
      await this.setAsCompleted(ids);
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

  private async _enqueue(
    data: EnqueueData,
    ops?: { upsert: boolean }
  ): Promise<InsertResult[]> {
    const newData = R.pick(data, ['key', 'value']);
    const updateData: TaskUpdate = {
      ...newData,
      status: 'pending',
      queued_at: new Date().toISOString(),
    };
    console.log({ newData, updateData });
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

  private async getNextQueueTasks(params: {
    statuses: TaskStatus[];
    limit: number;
  }) {
    const query = this.db
      .selectFrom('tasks')
      .selectAll()
      .orderBy('queued_at')
      .where('status', 'in', params.statuses)
      .limit(params.limit);
    this.logSql(query);
    return await query.execute();
  }

  private async setAsProcessing(ids: number[]) {
    const query = this.db.updateTable('tasks').where('id', 'in', ids).set({
      status: 'processing',
      processed_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
    });
    this.logSql(query);
    await query.execute();
  }

  private async setAsCompleted(ids: number[]) {
    const query = this.db.updateTable('tasks').where('id', 'in', ids).set({
      status: 'completed',
      completed_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
    });
    this.logSql(query);
    await query.execute();
  }

  private async setAsFailed(ids: number[]) {
    const query = this.db.updateTable('tasks').where('id', 'in', ids).set({
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
