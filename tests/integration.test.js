import request from 'supertest';
import app from '../server.js'; // exporte app au lieu de listen dans server.js

describe('GET /last-metro', () => {
  it('200 station connue', async () => {
    const res = await request(app).get('/last-metro?station=Chatelet');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('station');
    expect(res.body).toHaveProperty('lastMetro');
  });

  it('404 station inconnue', async () => {
    const res = await request(app).get('/last-metro?station=Inconnue');
    expect(res.statusCode).toBe(404);
  });

  it('400 sans station', async () => {
    const res = await request(app).get('/last-metro');
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /next-metro', () => {
  it('200 station fournie', async () => {
    const res = await request(app).get('/next-metro?station=Chatelet');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('nextArrival');
    expect(res.body.nextArrival).toMatch(/^\d{2}:\d{2}$/);
  });
});
