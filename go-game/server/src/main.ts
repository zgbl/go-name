import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:5004',
    methods: ['GET', 'POST'],
    allowedHeaders: ['content-type'],
    credentials: true,
  });
  await app.listen(3004);
}
bootstrap();
