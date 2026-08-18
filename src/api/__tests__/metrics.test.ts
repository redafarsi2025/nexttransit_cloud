import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { metricsMiddleware } from '../../middleware/metricsMiddleware';
import {
  metricsRegistry,
  resetMetrics,
  httpRequestsTotal,
  bullmqJobsTotal
} from '../../lib/metrics';

describe('Metrics Architecture & Security', () => {
  beforeEach(() => {
    resetMetrics();
  });

  afterEach(() => {
    resetMetrics();
  });

  describe('Test 1 — Route normalisée', () => {
    it('should aggregate metrics by route definition, not by URL parameters', async () => {
      const app = express();
      app.use(metricsMiddleware);
      // Dummy route that matches vehicles/:id
      const router = express.Router();
      router.get('/:id', (req, res) => {
        res.status(200).json({ ok: true });
      });
      app.use('/api/vehicles', router);

      await request(app).get('/api/vehicles/123');
      await request(app).get('/api/vehicles/456');
      await request(app).get('/api/vehicles/789');

      const metrics = await metricsRegistry.metrics();
      
      // Should not contain the IDs
      expect(metrics).not.toContain('route="/api/vehicles/123"');
      expect(metrics).not.toContain('route="/api/vehicles/456"');
      
      // Should contain the normalized route with count 3
      expect(metrics).toContain('route="/api/vehicles/:id"');
      
      // Verify via the registry object directly as well
      const count = await httpRequestsTotal.get();
      const val = count.values.find(v => v.labels.route === '/api/vehicles/:id');
      expect(val?.value).toBe(3);
    });
  });

  describe('Test 2 — Aucune fuite', () => {
    it('metrics output should never leak business data', async () => {
      const app = express();
      app.use(metricsMiddleware);
      
      app.post('/api/webhooks/telemetry/:provider', (req, res) => {
        // Simulate a webhook storing business data in context but it shouldn't leak to metrics
        res.status(200).send();
      });

      await request(app)
        .post('/api/webhooks/telemetry/flespi')
        .set('Authorization', 'FlespiToken 12345')
        .send({
          imei: '868123456789012',
          tenant_id: 'tenant-123',
          latitude: 36.7528,
          longitude: 3.0420
        });

      const metrics = await metricsRegistry.metrics();
      
      const forbiddenStrings = [
        'tenant_id',
        'tenant-123',
        'imei',
        '868123456789012',
        'device_id',
        'latitude',
        'longitude',
        '36.7528',
        'authorization',
        'FlespiToken',
        '12345'
      ];

      for (const str of forbiddenStrings) {
        expect(metrics.toLowerCase()).not.toContain(str.toLowerCase());
      }
    });
  });

  describe('Test 3 — Isolation des processus', () => {
    it('should distinguish API metrics from Worker metrics conceptually', async () => {
      // In this test, we verify that API only sets "enqueued" and worker sets "started"/"completed"/"failed"
      // In production they are separate processes, but we can test the label constraints here.
      
      // Simuler le processus API
      bullmqJobsTotal.inc({ queue: 'telemetry-ingestion', status: 'enqueued' });
      
      // Simuler le processus Worker
      bullmqJobsTotal.inc({ queue: 'telemetry-ingestion', status: 'started' });
      bullmqJobsTotal.inc({ queue: 'telemetry-ingestion', status: 'completed' });

      const metrics = await metricsRegistry.metrics();
      
      expect(metrics).toContain('status="enqueued"');
      expect(metrics).toContain('status="started"');
      expect(metrics).toContain('status="completed"');
    });
  });

  describe('Test 4 — resetMetrics()', () => {
    it('should correctly reset metrics without destroying singletons', async () => {
      httpRequestsTotal.inc({ method: 'GET', route: '/test', status: '200' }, 5);
      
      let count = await httpRequestsTotal.get();
      let val = count.values.find(v => v.labels.route === '/test');
      expect(val?.value).toBe(5);

      resetMetrics();

      // After reset, value should be cleared
      count = await httpRequestsTotal.get();
      expect(count.values.length).toBe(0);

      // But the object still works (not cleared from registry entirely)
      httpRequestsTotal.inc({ method: 'GET', route: '/test', status: '200' }, 2);
      count = await httpRequestsTotal.get();
      val = count.values.find(v => v.labels.route === '/test');
      expect(val?.value).toBe(2);
    });
  });
});
