declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'helmet' {
  import type { RequestHandler } from 'express';
  interface HelmetOptions {
    contentSecurityPolicy?: boolean | Record<string, any>;
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: boolean;
    crossOriginResourcePolicy?: boolean;
    originAgentCluster?: boolean;
    referrerPolicy?: boolean | Record<string, any>;
    strictTransportSecurity?: boolean | Record<string, any>;
    xContentTypeOptions?: boolean;
    xDnsPrefetchControl?: boolean;
    xDownloadOptions?: boolean;
    xFrameOptions?: boolean | Record<string, any>;
    xPermittedCrossDomainPolicies?: boolean | Record<string, any>;
    xPoweredBy?: boolean;
    xXssProtection?: boolean;
  }
  function helmet(options?: HelmetOptions): RequestHandler;
  export default helmet;
}

