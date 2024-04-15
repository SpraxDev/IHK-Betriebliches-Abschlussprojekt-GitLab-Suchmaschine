import { singleton } from 'tsyringe';
import { logAndCaptureError } from '../SentrySdk';
import Task from './tasks/Task';

@singleton()
export default class TaskQueue {
  private readonly queue: Task[] = [];
  private runningTask: Task | null = null;

  private processedTaskCount = 0;
  private erroredTaskCount = 0;

  add(tasks: Task | Task[]): void {
    if (!Array.isArray(tasks)) {
      tasks = [tasks];
    }

    for (const task of tasks) {
      for (const queuedTask of this.queue) {
        if (queuedTask.equals(task)) {
          return;
        }
      }

      this.queue.push(task);
    }

    this.queue.sort((a, b) => a.priority - b.priority);

    this.tickProcessing();
  }

  shutdown(): void {
    this.queue.length = 0;
  }

  getProcessedTaskCount(): number {
    return this.processedTaskCount;
  }

  getErroredTaskCount(): number {
    return this.erroredTaskCount;
  }

  getRunningTaskName(): string | null {
    return this.runningTask?.displayName ?? null;
  }

  getQueuedTaskNames(): string[] {
    return this.queue.map(task => task.displayName);
  }

  private tickProcessing(): void {
    if (this.runningTask != null || this.queue.length === 0) {
      return;
    }

    this.runningTask = this.queue.shift()!;

    const timeMessage = `[TaskQueue] Finished execution: ${this.runningTask.displayName}`;
    console.time(timeMessage);

    this.runningTask.run()
      .catch((err) => {
        ++this.erroredTaskCount;
        logAndCaptureError(err);
      })
      .finally(() => {
        console.timeEnd(timeMessage);
        this.runningTask = null;
        ++this.processedTaskCount;

        this.tickProcessing();
      });
  }
}
