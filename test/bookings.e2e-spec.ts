import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup-app';

const prisma = new PrismaClient();
const SLOT_A = '00000000-0000-4000-8000-000000000001';
const SLOT_B = '00000000-0000-4000-8000-000000000002';
const body = (slotId: string, n = 'Alex Morgan') => ({ slotId, customerName: n, customerEmail: 'alex@example.com' });

describe('Appointment Booking API (PostgreSQL)', () => {
  let app: INestApplication;
  let http: any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Booking", "Slot" CASCADE');
    await prisma.slot.createMany({
      data: [
        { id: SLOT_A, startsAt: new Date('2030-01-15T09:00:00Z'), endsAt: new Date('2030-01-15T09:30:00Z') },
        { id: SLOT_B, startsAt: new Date('2030-01-15T09:30:00Z'), endsAt: new Date('2030-01-15T10:00:00Z') },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('1) books a slot (201) and removes it from available slots', async () => {
    const res = await request(http).post('/bookings').send(body(SLOT_A)).expect(201);
    expect(res.body.booking).toMatchObject({ slotId: SLOT_A, status: 'active' });
    const list = await request(http).get('/slots').expect(200);
    expect(list.body.slots.map((s: any) => s.id)).toEqual([SLOT_B]);
  });

  it('2) concurrent requests for the same slot: exactly one 201, others 409, one active row', async () => {
    const N = 10;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) => request(http).post('/bookings').send(body(SLOT_A, `User ${i}`))),
    );
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(N - 1);
    results.filter((r) => r.status === 409).forEach((r) => expect(r.body.error.code).toBe('SLOT_UNAVAILABLE'));
    expect(await prisma.booking.count({ where: { slotId: SLOT_A, status: 'active' } })).toBe(1);
  });

  it('3) cancel (200) frees the slot and allows a new booking; repeat cancel is idempotent', async () => {
    const created = await request(http).post('/bookings').send(body(SLOT_A)).expect(201);
    const id = created.body.booking.id;

    const c1 = await request(http).delete(`/bookings/${id}`).expect(200);
    expect(c1.body.booking.status).toBe('cancelled');
    const list = await request(http).get('/slots').expect(200);
    expect(list.body.slots.map((s: any) => s.id)).toContain(SLOT_A);

    await request(http).post('/bookings').send(body(SLOT_A, 'New User')).expect(201);
    const c2 = await request(http).delete(`/bookings/${id}`).expect(200); // إلغاء قديم لا يؤثر في الحجز الأحدث
    expect(c2.body).toEqual(c1.body);
    expect(await prisma.booking.count({ where: { slotId: SLOT_A, status: 'active' } })).toBe(1);
  });

  it('validation and not-found errors use the documented format', async () => {
    const v = await request(http).post('/bookings').send({ slotId: 'nope', customerName: '  ', customerEmail: 'x' }).expect(400);
    expect(v.body.error.code).toBe('VALIDATION_ERROR');
    await request(http)
      .post('/bookings').set('Content-Type', 'application/json').send('{bad json').expect(400);
    const nf = await request(http).post('/bookings').send(body('99999999-9999-4999-8999-999999999999')).expect(404);
    expect(nf.body.error.code).toBe('SLOT_NOT_FOUND');
    await request(http).delete('/bookings/not-a-uuid').expect(400);
    const bn = await request(http).delete('/bookings/99999999-9999-4999-8999-999999999999').expect(404);
    expect(bn.body.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('trims name and email before saving', async () => {
    const res = await request(http)
      .post('/bookings').send({ slotId: SLOT_A, customerName: '  Alex  ', customerEmail: ' alex@example.com ' }).expect(201);
    expect(res.body.booking).toMatchObject({ customerName: 'Alex', customerEmail: 'alex@example.com' });
  });

  it('serves OpenAPI at /openapi.json and docs at /docs', async () => {
    const spec = await request(http).get('/openapi.json').expect(200);
    expect(Object.keys(spec.body.paths)).toEqual(expect.arrayContaining(['/slots', '/bookings', '/bookings/{bookingId}']));
    await request(http).get('/docs').expect(200);
  });
});
