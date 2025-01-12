import { NewTask, TaskStatus } from './types.database';

export type LogLevel = 'sql';
export type EnqueueData = Pick<NewTask, 'key' | 'value'>;
export interface ProcessOptions {
  statuses?: TaskStatus[] | 'all';
  keepAfterProcess?: boolean;
}

export interface ProcessManyOptions extends ProcessOptions {
  limit?: number;
}
