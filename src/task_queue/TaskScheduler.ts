import { injectable } from 'tsyringe';
import TaskQueue from './TaskQueue';
import DeleteExpiredSessions from './tasks/DeleteExpiredSessions';
import QueueAllProjectsForIndexingTask from './tasks/QueueAllProjectsForIndexingTask';
import Task from './tasks/Task';

@injectable()
export default class TaskScheduler {
  private readonly intervalTimeouts: NodeJS.Timeout[] = [];

  constructor(
    private readonly taskQueue: TaskQueue,
    private readonly queueAllProjectsForIndexingTask: QueueAllProjectsForIndexingTask,
    private readonly deleteExpiredSessionsTask: DeleteExpiredSessions
  ) {
  }

  start(): void {
    this.schedule(this.queueAllProjectsForIndexingTask, 30 * 60 * 1000 /* 30m */);
    this.schedule(this.deleteExpiredSessionsTask, 60 * 60 * 1000 /* 60m */);
  }

  shutdown(): void {
    for (const timeout of this.intervalTimeouts) {
      clearInterval(timeout);
    }
    this.intervalTimeouts.length = 0;
  }

  private schedule(task: Task, millis: number): void {
    this.taskQueue.add(task);

    const timeout = setInterval(() => this.taskQueue.add(task), millis);
    this.intervalTimeouts.push(timeout);
  }
}
