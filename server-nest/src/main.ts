import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`PDF Fill API: http://localhost:${port}`);
}
bootstrap();