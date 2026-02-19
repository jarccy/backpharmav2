import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MyIoAdapter } from './modules/whatsapp/websockets/socket.io';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());

  app.setGlobalPrefix('api/');
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.URL],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useWebSocketAdapter(new MyIoAdapter(app));

  app.use('/public', express.static(join(__dirname, '..', 'public'),
    {
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
      },
    })
  );

  await app.listen(process.env.PORT || 5000);
}
bootstrap();
