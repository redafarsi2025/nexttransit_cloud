import pino from 'pino';
import { getRequestContext } from '../middleware/requestContext';

const env = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (env === 'development' ? 'debug' : 'info');

const pinoOptions: pino.LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  mixin() {
    const context = getRequestContext();
    if (context) {
      return {
        request_id: context.request_id,
        tenant_id: context.tenant_id,
        user_id: context.user_id,
      };
    }
    return {};
  },
};

if (env === 'development') {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(pinoOptions);
