import { NestFactory }      from '@nestjs/core';
import { ExpressAdapter }   from '@nestjs/platform-express';
import { AppModule }        from '../src/app.module';
import express, { Express, Request, Response } from 'express';

let cachedServer: Express | null = null;

async function createServer(): Promise<Express> {
  const server = express();

  // Attach Nest to the express server
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    { logger: ['error','warn'] },
  );
  app.enableCors();
  await app.init();

  return server;
}

// THIS is the **default** export Vercel requires:
export default async function handler(req: Request, res: Response) {
  if (!cachedServer) {
    // only once: bootstrap Nest & Express
    cachedServer = await createServer();
  }
  // now cachedServer is the real Express app, so call it:
  return cachedServer(req, res);
}
