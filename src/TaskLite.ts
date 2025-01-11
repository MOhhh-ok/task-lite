import sqlite3 from 'sqlite3';
import { initDb } from './db';
import {
  addTask,
  processTask,
  addOrUpdateTask,
  deleteTask,
  dequeueTask,
  findTaskByKey,
  updateTask,
} from './taskHelper';

export class TaskLite {
  private db: sqlite3.Database;
  private constructor(db: sqlite3.Database) {
    this.db = db;
  }
  static async create(params: { path: string }) {
    const db = await initDb(params);
    return new TaskLite(db);
  }
  async addTask(params: Parameters<typeof addTask>[1]) {
    return await addTask(this.db, params);
  }
  async addOrUpdateTask(params: Parameters<typeof addOrUpdateTask>[1]) {
    return await addOrUpdateTask(this.db, params);
  }
  async processTask(params: Parameters<typeof processTask>[1]) {
    return await processTask(this.db, params);
  }
  // async deleteTask(params: Parameters<typeof deleteTask>[1]) {
  //   return await deleteTask(this.db, params);
  // }
  // async dequeueTask(params: Parameters<typeof dequeueTask>[1]) {
  //   return await dequeueTask(this.db, params);
  // }
  // async findTaskByCategoryAndKey(
  //   params: Parameters<typeof findTaskByCategoryAndKey>[1]
  // ) {
  //   return await findTaskByCategoryAndKey(this.db, params);
  // }
  // async updateTask(id: number, params: Parameters<typeof updateTask>[2]) {
  //   return await updateTask(this.db, id, params);
  // }
}
