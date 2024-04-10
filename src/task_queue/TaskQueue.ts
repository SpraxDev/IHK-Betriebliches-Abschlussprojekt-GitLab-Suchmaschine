import { logAndCaptureError } from '../SentrySdk';
import Task from './tasks/Task';

export default class TaskQueue {
  private readonly queue: Task[] = [];
  private runningTask: Task | null = null;

  add(task: Task): void {
    for (const queuedTask of this.queue) {
      if (queuedTask.equals(task)) {
        return;
      }
    }

    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

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
      .then(() => console.timeEnd(timeMessage))
      .catch(logAndCaptureError)
      .finally(() => {
        this.runningTask = null;
        this.tickProcessing();
      });
  }
}