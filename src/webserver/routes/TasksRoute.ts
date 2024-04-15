import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import TaskQueue from '../../task_queue/TaskQueue';
import FastifyWebServer from '../FastifyWebServer';

@injectable()
export default class TasksRoute {
  constructor(private readonly taskQueue: TaskQueue) {
  }

  register(server: FastifyInstance): void {
    // TODO: Require login
    // TODO: Render HTML instead of JSON
    server.all('/tasks', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => {
          const tasks = this.taskQueue.getQueuedTaskNames();

          await reply.send({
            currentTask: this.taskQueue.getRunningTaskName(),
            queue: {
              size: tasks.length,
              tasks: tasks
            },
            processed: this.taskQueue.getProcessedTaskCount(),
            errored: this.taskQueue.getErroredTaskCount()
          });
        }
      });
    });
  }
}
