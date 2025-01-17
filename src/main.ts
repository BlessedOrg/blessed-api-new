import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { json, urlencoded } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"]
  });
  app.enableCors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  });
  app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));
  app.setGlobalPrefix("/api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true
    })
  );
  app.use(json({ limit: "5mb" }));
  app.use(urlencoded({ extended: true, limit: "5mb" }));

  const server = app.getHttpServer();
  const timeout = 2 * 60 * 1000; // 2 minutes
  // The timeout value for sockets
  server.setTimeout(timeout);
  // The number of milliseconds of inactivity a server needs to wait for additional incoming data
  server.keepAliveTimeout = timeout;
  // Limit the amount of time the parser will wait to receive the complete HTTP headers
  server.headersTimeout = timeout;
  await app.listen(process.env.PORT || 3000, "0.0.0.0");
}
bootstrap();
