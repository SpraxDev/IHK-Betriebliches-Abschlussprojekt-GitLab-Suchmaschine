import 'reflect-metadata';
import { container } from 'tsyringe';
import { IS_PRODUCTION } from './constants';
import FastifyWebServer from './webserver/FastifyWebServer';

let webServer: FastifyWebServer | undefined;

bootstrap();

async function bootstrap(): Promise<void> {
  registerShutdownHooks();

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

    await webServer?.shutdown();
    webServer = undefined;

    console.log('Finished graceful shutdown.');
    process.exit(0);
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
  process.on('SIGQUIT', handleShutdown);
  process.on('SIGHUP', handleShutdown);
}
