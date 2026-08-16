import { Queue } from 'bullmq';
import crypto from 'crypto';

const TELEMETRY_QUEUE_NAME = 'telemetry-ingestion';

async function runLoadTest() {
  const levels = [
    { name: 'Smoke', vehicles: 100 },
    { name: 'MVP', vehicles: 1000 },
    // { name: 'Stress', vehicles: 5000 },
    // { name: 'Architecture cible', vehicles: 10000 }
  ];

  console.log('--- NEXTTRANSIT PHASE 2E LOAD TEST ---');

  for (const level of levels) {
    console.log(`\nStarting ${level.name} Load Test (${level.vehicles} vehicles)`);
    console.log(`Target: 1 event / 10 seconds / vehicle -> ${level.vehicles / 10} events/sec`);
    
    // Simulate sending events directly via HTTP to the webhook gateway
    const start = Date.now();
    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = Math.min(level.vehicles, 100); 

    for (let i = 0; i < level.vehicles; i += BATCH_SIZE) {
      const promises = [];
      for (let j = 0; j < BATCH_SIZE && (i + j) < level.vehicles; j++) {
        const externalDeviceId = `TEST-DEV-${i + j}`;
        const payload = {
          provider: 'traccar',
          rawPayload: {
            device: { uniqueId: externalDeviceId },
            position: { latitude: 36.75, longitude: 3.05, speed: 60, fixTime: new Date().toISOString() }
          }
        };

        promises.push(
          fetch('http://localhost:3000/api/webhooks/telemetry/traccar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-secret' // Adjust based on your dev config
            },
            body: JSON.stringify(payload.rawPayload)
          }).then(res => {
            if (res.status === 202) sent++;
            else failed++;
          }).catch(() => failed++)
        );
      }
      await Promise.all(promises);
    }
    
    const duration = Date.now() - start;
    console.log(`Results for ${level.name}:`);
    console.log(`Sent: ${sent}`);
    console.log(`Failed (HTTP 4xx/5xx): ${failed}`);
    console.log(`Throughput: ${(sent / (duration / 1000)).toFixed(2)} req/sec`);
    
    if (level.name === 'Smoke') {
      console.log('Waiting 5 seconds before next level...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

runLoadTest().catch(console.error);
