import 'reflect-metadata';
import { container } from 'tsyringe';
import { IS_PRODUCTION } from './constants';
import DatabaseClient from './database/DatabaseClient';
import { initSentrySdk, shutdownSentrySdk } from './SentrySdk';
import TaskQueue from './task_queue/TaskQueue';
import TaskScheduler from './task_queue/TaskScheduler';
import FastifyWebServer from './webserver/FastifyWebServer';

let taskQueue: TaskQueue | undefined;
let taskScheduler: TaskScheduler | undefined;
let webServer: FastifyWebServer | undefined;

bootstrap();

async function bootstrap(): Promise<void> {
  await initSentrySdk();
  registerShutdownHooks();

  if (IS_PRODUCTION) {
    await container.resolve(DatabaseClient).runDatabaseMigrations();
  }

  taskQueue = container.resolve(TaskQueue);
  taskScheduler = container.resolve(TaskScheduler);
  taskScheduler.start();

  webServer = container.resolve(FastifyWebServer);
  await webServer.listen('0.0.0.0', 8087);

  console.log();
  if (!IS_PRODUCTION) {
    console.log('RUNNING IN DEVELOPMENT MODE');
  }
  console.log(`Application is ready to accept requests (http://127.0.0.1:8087/)`);  // TODO: Replace with actual base URL
}

function registerShutdownHooks(): void {
  const handleShutdown = async () => {
    console.log('Shutting down...');

    taskScheduler?.shutdown();
    taskScheduler = undefined;

    taskQueue?.shutdown();
    taskQueue = undefined;

    await webServer?.shutdown();
    webServer = undefined;

    await shutdownSentrySdk();

    console.log('Finished graceful shutdown.');
    process.exit(0);
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
  process.on('SIGQUIT', handleShutdown);
  process.on('SIGHUP', handleShutdown);
}
