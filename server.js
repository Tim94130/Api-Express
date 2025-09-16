import 'dotenv/config';
import express from 'express';
import { DateTime } from 'luxon';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// charge le fichier OpenAPI YAML
const openapiPath = path.join(__dirname, 'openapi.yaml');
const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));

const app = express(); // <<< d’abord créer app

// ensuite brancher swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get('/openapi.json', (_req, res) => res.json(openapiDoc));

const TZ = 'Europe/Paris';
const HEADWAY_MIN = 3;
const SERVICE_START_MIN = 5 * 60 + 30; // 05:30
const SERVICE_END_MIN = 1 * 60 + 15;   // 01:15

// --- logging par requête (méthode, chemin, status, durée) ---
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
  });
  next();
});

// JSON only
app.use((_, res, next) => {
  res.type('application/json; charset=utf-8');
  next();
});

// /health et /api/health (alias)
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// utils temps
const nowParis = () => DateTime.now().setZone(TZ);
const minutesSinceMidnight = (dt) => dt.hour * 60 + dt.minute;
const fmtFromMinutesToday = (dt, minutes) =>
  dt.startOf('day').plus({ minutes: minutes % 1440 }).toFormat('HH:mm');

const isServiceOpenAt = (mins) =>
  mins >= SERVICE_START_MIN || mins <= SERVICE_END_MIN;

// GET /next-metro?station=NAME
app.get('/next-metro', (req, res) => {
  const station = (req.query.station ?? '').toString().trim();
  if (!station) {
  return res.status(400).json({
    error: 'missing station',
    hint: 'Use /next-metro?station=Chatelet'
  });
}


  const now = nowParis();
  const mins = minutesSinceMidnight(now);

  if (!isServiceOpenAt(mins)) {
    // hors plage → comportement choisi et documenté
    return res.status(200).json({ service: 'closed', tz: TZ });
  }

  // prochain passage arrondi au prochain multiple de 3 minutes
  const delta = (HEADWAY_MIN - (mins % HEADWAY_MIN)) % HEADWAY_MIN;
  let nextMin = mins + delta;

  // si on est après minuit, ne pas dépasser 01:15
  if (mins <= SERVICE_END_MIN && nextMin > SERVICE_END_MIN) {
    return res.status(200).json({ service: 'closed', tz: TZ });
  }

  const nextArrival = fmtFromMinutesToday(now, nextMin);
  const isLast = mins >= 45 && mins <= 75; // 00:45 → 01:15

  // ✅ "line": "M1" comme dans l'exemple
  return res.status(200).json({
    station,
    line: 'M1',
    headwayMin: HEADWAY_MIN,
    nextArrival,
    isLast,
    tz: TZ
  });
});

// 404 JSON
app.use((_req, res) => {
  return res.status(404).json({ error: 'Not Found' });
});

// start
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}  (tz: ${TZ})`);
});
