import express from 'express';
import path from 'path';
import { createServer as createViteServer, loadEnv } from 'vite';

// Ensure .env is loaded for the server context
const env = loadEnv('', process.cwd(), '');
Object.assign(process.env, env);

import { logger } from './src/lib/logger';
import { requestContextMiddleware, getRequestContext } from './src/middleware/requestContext';
import { healthRouter } from './src/api/healthRouter';
import { freeTranslateText } from './src/services/freeTranslationService';
import { metricsMiddleware } from './src/middleware/metricsMiddleware';
import { metricsRegistry, nexttransitBuildInfo } from './src/lib/metrics';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import { vehicleRouter } from './src/api/vehicles';
import { maintenanceRouter } from './src/api/maintenance';
import { workOrderRouter } from './src/api/workOrders';
import { fuelRouter } from './src/api/fuel';
import { inventoryRouter } from './src/api/inventory';
import { incidentRouter } from './src/api/incidents';
import { platformAdminRouter } from './src/api/platformAdmin';
import { platformAuthCheck } from './src/api/middleware';
import { resolveFaultCode } from './src/services/faultCodeMappingService';
import { enqueueTelemetry } from './src/services/telemetry/queue/TelemetryQueue';
import { TelematicsProviderType } from './src/types';
import { supabase } from './src/lib/supabaseServer';
import { TelematicsProviderRegistry } from './src/services/telemetry/TelematicsProviderRegistry';
import { FlespiAdapter } from './src/services/telemetry/providers/FlespiAdapter';
import { ManualEntryAdapter } from './src/services/telemetry/providers/ManualEntryAdapter';
import { TraccarAdapter } from './src/services/telemetry/providers/TraccarAdapter';
import { WebhookSecurityService } from './src/services/security/WebhookSecurityService';

// Register core telematics adapters
TelematicsProviderRegistry.register(FlespiAdapter);
TelematicsProviderRegistry.register(ManualEntryAdapter);
TelematicsProviderRegistry.register(TraccarAdapter);

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Simple in-memory rate limiter for translation endpoint
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

const TranslateRequestSchema = z.object({
  sourceText: z.string().min(1, 'Source text cannot be empty').max(5000, 'Source text cannot exceed 5000 characters'),
  sourceLang: z.string().optional().default('fr'),
  targetLang: z.string(),
  key: z.string().optional(),
  namespace: z.string().optional(),
  context: z.string().optional(),
  glossaryTerms: z.array(z.any()).optional().default([]),
});

const PredictiveAiRequestSchema = z.object({
  vehicle_id: z.string().uuid('Invalid vehicle_id format'),
  plate: z.string().min(1),
  status: z.string().optional(),
  mileage: z.number().optional(),
  active_fault_codes: z.array(z.string()).optional(),
  maintenance_history: z.array(z.any()).optional(),
  telemetry: z.record(z.string(), z.any()).optional()
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// H3: HTTP Security Headers Middleware (Helmet + Explicit CSP - OWASP Compliant)
// ─────────────────────────────────────────────────────────────────────────────
function securityHeadersMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Content Security Policy (CSP) - Scoped to Supabase ONLY (Gemini remains server-side only)
  const supabaseDomain = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
  const cleanSupabaseDomain = supabaseDomain.replace(/^https?:\/\//, '');
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${supabaseDomain} wss://${cleanSupabaseDomain}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-XSS-Protection', '0');
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// M2: CORS Middleware with Whitelist and 403 Rejection
// ─────────────────────────────────────────────────────────────────────────────
function corsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
  const rawAllowed = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = rawAllowed
    ? rawAllowed.split(',').map((o) => o.trim()).filter(Boolean)
    : defaultOrigins;

  const origin = req.headers.origin;

  if (origin) {
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Tenant-Id');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
    } else {
      return res.status(403).json({ error: 'CORS Forbidden: Origin not allowed' });
    }
  }

  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// M1: Global Express API Rate Limiter
// ─────────────────────────────────────────────────────────────────────────────
function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Rate limit exceeded. Please try again later.' });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Correlation ID & Logging Context
  app.use(requestContextMiddleware);
  app.use((req, res, next) => {
    const context = getRequestContext();
    if (context && context.request_id) {
      res.setHeader('X-Request-ID', context.request_id);
    }
    next();
  });

  // Prometheus Metrics Middleware
  app.use(metricsMiddleware);

  // 1. Security & Middleware Setup (Helmet, CSP, CORS)
  const supabaseDomain = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
  const cleanSupabaseDomain = supabaseDomain.replace(/^https?:\/\//, '');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", supabaseDomain, `wss://${cleanSupabaseDomain}`],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));

  // 2. Global Rate Limiting on API endpoints (M1)
  app.use('/api', apiRateLimiter);

  // Phase 0: Socle Technique - Backend API Routing
  app.use('/api/vehicles', vehicleRouter);
  app.use('/api/maintenance', maintenanceRouter);
  app.use('/api/work-orders', workOrderRouter);
  app.use('/api/fuel', fuelRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/incidents', incidentRouter);
  app.use('/api/platform', platformAdminRouter);

  // Phase 2F-02: Health & Readiness Probes
  app.use('/health', healthRouter);

  // Platform Admin Frontend UI (SaaS Operator Panel)
  app.get('/platform-admin', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/platform-admin.html'));
  });

  // Gate access to /admin route in the server-side environment
  app.use('/admin', platformAuthCheck, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // If auth checks pass, proceed to serve the React application
    next();
  });

  // API Endpoint: Phase 2 Gemini 3.6 Flash Predictive AI Failure Forecasting Engine
  app.post('/api/predictive-ai', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
      }
      const token = authHeader.split(' ')[1];

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase env vars not configured for auth verification' });
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const role = user.user_metadata?.role || user.app_metadata?.role;
      const allowedRoles = ['DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER'];
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: `Forbidden: Role ${role} is not authorized for predictive AI.` });
      }

      const parseResult = PredictiveAiRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid input parameters', details: parseResult.error.format() });
      }
      const vehicleData = parseResult.data;

      // Tenant Scoping (Cross-Tenant Prevention)
      // Since supabase client is initialized with the user's JWT, RLS will apply.
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', vehicleData.vehicle_id)
        .single();
        
      if (vehicleError || !vehicle) {
        return res.status(403).json({ error: 'Forbidden: Vehicle not found or belongs to another tenant.' });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY environment variable not configured.',
          useFallback: true,
        });
      }

      const prompt = `You are NextTransit's Predictive Mechanical Maintenance & Telemetry Failure Forecasting Model.
Analyze the following CAN-Bus OBD-II telemetry metrics and vehicle history:
${JSON.stringify(vehicleData, null, 2)}

Calculate failure risk, estimated hours before physical critical breakdown, critical subsystem, anomalies, and recommended intervention.
Provide your rationale in clear French (reasoning_fr).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vehicle_id: { type: Type.STRING },
              vehicle_plate: { type: Type.STRING },
              critical_subsystem: { type: Type.STRING },
              failure_likelihood_percentage: { type: Type.NUMBER },
              estimated_hours_to_failure: { type: Type.NUMBER },
              predictive_r1_alert: { type: Type.BOOLEAN },
              recommended_action: { type: Type.STRING },
              confidence_score: { type: Type.NUMBER },
              telemetry_anomalies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sensor: { type: Type.STRING },
                    current_value: { type: Type.STRING },
                    baseline_value: { type: Type.STRING },
                    deviation: { type: Type.STRING },
                  },
                },
              },
              reasoning_fr: { type: Type.STRING },
            },
            required: [
              'vehicle_id',
              'vehicle_plate',
              'critical_subsystem',
              'failure_likelihood_percentage',
              'estimated_hours_to_failure',
              'predictive_r1_alert',
              'recommended_action',
              'confidence_score',
              'telemetry_anomalies',
              'reasoning_fr',
            ],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        return res.status(500).json({ error: 'Empty AI response', useFallback: true });
      }

      const parsedResult = JSON.parse(resultText);
      parsedResult.generated_at = new Date().toISOString();
      return res.json(parsedResult);
    } catch (error: any) {
      console.error('Error in /api/predictive-ai:', error);
      return res.status(500).json({
        error: error.message || 'Predictive AI generation failed',
        useFallback: true,
      });
    }
  });

  // API Endpoint: Server-side Gemini Translation (Now powered by Free High-Fidelity Local Engine with Zod validation)
  app.post('/api/translate', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });
      }

      const parseResult = TranslateRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid input parameters', details: parseResult.error.format() });
      }

      const { sourceText, sourceLang, targetLang, key, glossaryTerms } = parseResult.data;

      // Translate utilizing the free high-performance local engine
      const translatedText = freeTranslateText(
        sourceText,
        sourceLang || 'fr',
        targetLang,
        key,
        glossaryTerms || []
      );

      res.json({
        translatedText,
        confidenceScore: 1.0,
        glossaryTermsPreserved: glossaryTerms ? glossaryTerms.map((g: any) => g.term) : [],
        status: 'AI Generated', // Keeps compatibility with the frontend UI
      });
    } catch (error: any) {
      console.error('Error in /api/translate:', error);
      res.status(500).json({
        error: error.message || 'Free Translation failed',
        fallback: req.body.sourceText,
      });
    }
  });

  // Telemetry Webhook Ingestion Routes
  // Dynamic Provider-Agnostic Route (Phase 2E - Distributed)
  app.post('/api/webhooks/telemetry/:provider', express.json({ limit: '256kb' }), async (req, res) => {
    const provider = req.params.provider as TelematicsProviderType;
    
    // 1 & 2. Gateway Authentication & Rate Limiting (Provider-Agnostic)
    try {
      const securityService = new WebhookSecurityService();
      const authResult = await securityService.authenticateAndRateLimit(provider, req);

      if (!authResult.authenticated) {
        if (authResult.reason === 'SERVICE_UNAVAILABLE') {
          // Rule 5: Fail closed on security dependency outage
          import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'error_503' }));
          return res.status(503).json({ error: 'Service Unavailable', message: 'Security service is temporarily unavailable' });
        }
        // NEVER LOG credentials. Only log the reason and provider.
        logger.warn({ event: 'telemetry_webhook_blocked', provider, reason: authResult.reason }, `Security blocked request for provider '${provider}'`);
        if (authResult.reason === 'RATE_LIMIT_EXCEEDED') {
          import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'error_429' }));
          return res.status(429).json({ error: 'Too many requests' });
        }
        import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'error_401' }));
        return res.status(401).json({ error: 'Unauthorized webhook' });
      }

      // 3. Enqueue the raw payload for background processing
      const correlationId = crypto.randomUUID();
      
      const enqueued = await enqueueTelemetry({
        provider,
        rawPayload: req.body,
        securityContext: authResult.context!,
        correlationId,
        receivedAt: Date.now()
      });

      if (!enqueued) {
        // Rule 5: If Redis/BullMQ is down, return 503 Service Unavailable
        import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'error_503' }));
        return res.status(503).json({ error: 'Service Unavailable', message: 'Telemetry queue is temporarily unavailable' });
      }

      logger.info({ event: 'telemetry_webhook_received', provider, payload_size: JSON.stringify(req.body).length, correlationId }, 'Webhook received and enqueued');

      // 4. Return 202 Accepted only if queued successfully
      import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'success' }));
      return res.status(202).json({ accepted: true, correlationId });

    } catch (err: any) {
      if (err.message && err.message.includes('Unknown or unregistered provider')) {
        import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'error_404' }));
        return res.status(404).json({ error: 'Provider not found', message: err.message });
      }
      logger.error({ event: 'telemetry_webhook_error', provider, error: err.message }, 'Processing error');
      import('./src/lib/metrics').then(m => m.telemetryWebhooksTotal.inc({ provider, status: 'error_500' }));
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // API Endpoint: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'NextTransit Localization API' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({
      event: 'http_error',
      route: req.path,
      status: err.status || 500,
      message: err.message,
    });
    res.status(err.status || 500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`NextTransit Server running on http://0.0.0.0:${PORT}`);
  });

  // Start internal metrics server on port 9090
  const METRICS_PORT = 9090;
  const metricsApp = express();
  
  // Update Build Info Metric
  nexttransitBuildInfo.set({ version: '2.1.0', environment: process.env.NODE_ENV || 'development', service: 'api' }, 1);

  metricsApp.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', metricsRegistry.contentType);
      const metrics = await metricsRegistry.metrics();
      res.end(metrics);
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  metricsApp.listen(METRICS_PORT, '0.0.0.0', () => {
    logger.info(`NextTransit API Metrics Server running on http://0.0.0.0:${METRICS_PORT}`);
  });
}

startServer();
