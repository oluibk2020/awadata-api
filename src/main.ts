import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from "./app.module";
import { TransformInterceptor } from './transform.interceptor';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Global validation pipe with whitelist and transformation
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

   

  // Basic production security headers
  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Production CORS origin handling
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  const trustedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      "https://awadata-api.onrender.com",
      "http://localhost:3000",
    ]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || trustedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  });

   const swaggerConfig = new DocumentBuilder()
     .setTitle("AwaData Commons API")
     .setDescription("Community-governed data access infrastructure")
     .setVersion("0.1.0")
     .addBearerAuth()
     .build();

   const document = SwaggerModule.createDocument(app, swaggerConfig);
   SwaggerModule.setup("api/docs", app, document);

  app.useGlobalInterceptors(new TransformInterceptor());
  const port = process.env.PORT ?? 2000;
  await app.listen(port);
  logger.log(`AwaData Commons API running on port ${port}`);
}
bootstrap();
