import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
import express from 'express';

interface RequestContext {
  request_id: string;
  tenant_id?: string;
  user_id?: string;
  [key: string]: any;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

export const requestContextMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const request_id = crypto.randomUUID();
  const context: RequestContext = {
    request_id,
  };

  requestContextStore.run(context, () => {
    next();
  });
};

export const getRequestContext = (): RequestContext | undefined => {
  return requestContextStore.getStore();
};

export const runWithContext = <T>(context: RequestContext, callback: () => T): T => {
  return requestContextStore.run(context, callback);
};
