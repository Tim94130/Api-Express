import 'dotenv/config';
import express from 'express';
import { DateTime } from 'luxon';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import pkg from 'pg';

const { Pool } = pkg;

// --- DB connection pool ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// charge le fichier OpenAPI YAML
const openapiPath = path.join(__dirname, 'openapi.yaml');
const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));

const app = express(); // <<< d’abord créer app

// --- Swagger ---
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get('/openapi.json', (_req, res) => res.json(openapiDoc));

const TZ = 'Europe/Paris';
const HEADWAY_MIN = 3;
const SERVICE_START_MIN = 5 * 60 + 30; // 05:30
const SERVICE_END_MIN = 1 * 60 + 15;   // 01:15

// --- logging par requête ---
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

// --- Endpoints système ---
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Endpoint test DB ---
app.get('/stations', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stations ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Erreur DB:', err);
    res.status(500).json({ error: 'DB connection failed' });
  }
});

// --- Utils temps ---
const nowParis = () => DateTime.now().setZone(TZ);
const minutesSinceMidnight = (dt) => dt.hour * 60 + dt.minute;
const fmtFromMinutesToday = (dt, minutes) =>
  dt.startOf('day').plus({ minutes: minutes % 1440 }).toFormat('HH:mm');

const isServiceOpenAt = (mins) =>
  mins >= SERVICE_START_MIN || mins <= SERVICE_END_MIN;

// --- Endpoint métier ---
app.get('/next-metro', (req, res) => {
  const station = (req.query.station ?? '').toString().trim();
  if (!station) {
    return res.status(400).json({
      error: 'missing station',
      hint: 'Use /next-metro?station=Chatelet',
    });
  }

  const now = nowParis();
  const mins = minutesSinceMidnight(now);

  if (!isServiceOpenAt(mins)) {
    return res.status(200).json({ service: 'closed', tz: TZ });
  }

  const delta = (HEADWAY_MIN - (mins % HEADWAY_MIN)) % HEADWAY_MIN;
  let nextMin = mins + delta;

  if (mins <= SERVICE_END_MIN && nextMin > SERVICE_END_MIN) {
    return res.status(200).json({ service: 'closed', tz: TZ });
  }

  const nextArrival = fmtFromMinutesToday(now, nextMin);
  const isLast = mins >= 45 && mins <= 75; // 00:45 → 01:15

  return res.status(200).json({
    station,
    line: 'M1',
    headwayMin: HEADWAY_MIN,
    nextArrival,
    isLast,
    tz: TZ,
  });
});
// GET /last-metro?station=NAME
app.get('/last-metro', async (req, res) => {
  const station = (req.query.station ?? '').toString().trim();

  if (!station) {
    return res.status(400).json({ error: 'missing station' });
  }

  try {
    // lire config.defaults
    const defaultsRes = await pool.query(
      `SELECT value FROM config WHERE key = 'metro.defaults'`
    );
    if (defaultsRes.rows.length === 0) {
      return res.status(500).json({ error: 'missing defaults config' });
    }
    const defaults = defaultsRes.rows[0].value; // type JSON

    // lire config.last
    const lastRes = await pool.query(
      `SELECT value FROM config WHERE key = 'metro.last'`
    );
    if (lastRes.rows.length === 0) {
      return res.status(500).json({ error: 'missing last-metro config' });
    }
    const lastMap = lastRes.rows[0].value; // type JSON map station -> HH:MM

    const stationKey = Object.keys(lastMap).find(
      (k) => k.toLowerCase() === station.toLowerCase()
    );

    if (!stationKey) {
      return res.status(404).json({ error: 'unknown station' });
    }

    return res.status(200).json({
      station: stationKey,
      lastMetro: lastMap[stationKey],
      line: defaults.line,
      tz: defaults.tz,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});


// --- 404 ---
app.use((_req, res) => {
  return res.status(404).json({ error: 'Not Found' });
});

// --- start ---
const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`✅ API running on http://localhost:${port}  (tz: ${TZ})`);
  });
}

export default app;

