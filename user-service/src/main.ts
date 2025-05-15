import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger,ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Use global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error on unexpected properties
      transform: true, // Transform payloads to DTO instances
    }),
  );

  const currentPort = process.env.PORT ?? 3000;
  await app.listen(currentPort, '0.0.0.0'); // Forces IPv4

  const url = await app.getUrl();
  logger.log(`App running at ${url}`);

  // Optional: show mapped routes from the internal router (not recommended in production)
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter.getType() === 'express') {
    const server = app.getHttpServer();
    const router = server._events?.request?._router;
    if (router?.stack) {
      router.stack
        .filter((r) => r.route)
        .forEach((r) => {
          logger.log(`${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
        });
    } else {
      logger.warn('Could not access Express router stack');
    }
  }
}
bootstrap();
