import { logAndCaptureError } from '../SentrySdk';
import Task from './tasks/Task';

export default class TaskQueue {
  private readonly queue: Task[] = [];
  private runningTask: Task | null = null;

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

  private tickProcessing(): void {
    if (this.runningTask != null || this.queue.length === 0) {
      return;
    }

    this.runningTask = this.queue.shift()!;

    const timeMessage = `[TaskQueue] Finished execution: ${this.runningTask.displayName}`;
    console.time(timeMessage);

    this.runningTask.run()
      .catch(logAndCaptureError)
      .finally(() => {
        console.timeEnd(timeMessage);
        this.runningTask = null;

        this.tickProcessing();
      });
  }
}
