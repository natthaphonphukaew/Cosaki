const request = require('supertest');
const app = require('../../src/app');

describe('Auth API', () => {
  describe('POST /api/v1/auth/send-otp', () => {
    it('returns 200 for valid phone', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+66812345678' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 422 for invalid phone', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: 'not-a-phone' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
