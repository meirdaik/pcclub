/** Typed calls for the customer API. Types come from the generated OpenAPI schema. */

import { api } from './client';
import type { components } from './schema';

type Schemas = components['schemas'];

export type TokenPair = Schemas['TokenPair'];
export type User = Schemas['UserOut'];
export type Club = Schemas['ClubOut'];
export type Zone = Schemas['ZoneOut'];
export type Pc = Schemas['PcOut'];
export type Package = Schemas['PackageOut'];
export type PcAvailability = Schemas['PcAvailabilityOut'];
export type Booking = Schemas['BookingOut'];
export type BookingPage = Schemas['BookingPage'];
export type Payment = Schemas['PaymentOut'];
export type PaymentMethod = Schemas['PaymentMethod'];

// --- auth ---

export const requestOtp = (phone: string) =>
  api<void>('POST', '/v1/auth/otp/request', { body: { phone }, auth: false });

export const verifyOtp = (phone: string, code: string) =>
  api<TokenPair>('POST', '/v1/auth/otp/verify', { body: { phone, code }, auth: false });

export const logout = (refreshToken: string) =>
  api<void>('POST', '/v1/auth/logout', { body: { refresh_token: refreshToken }, auth: false });

// --- profile ---

export const getMe = () => api<User>('GET', '/v1/me');

export const submitIdentity = (body: Schemas['IdentitySubmit']) =>
  api<User>('POST', '/v1/me/identity', { body });

// --- catalog ---

export const listClubs = () => api<Club[]>('GET', '/v1/clubs', { auth: false });

export const getClub = (clubId: string) =>
  api<Club>('GET', `/v1/clubs/${clubId}`, { auth: false });

export const listZones = (clubId: string) =>
  api<Zone[]>('GET', `/v1/clubs/${clubId}/zones`, { auth: false });

export const listPcs = (clubId: string) =>
  api<Pc[]>('GET', `/v1/clubs/${clubId}/pcs`, { auth: false });

/**
 * Fixed-price packages of a club (optionally of one zone). Book one by sending its id as
 * `package_id`; `is_night` packages are 18+.
 */
export const listPackages = (clubId: string, zoneId?: string) =>
  api<Package[]>('GET', `/v1/clubs/${clubId}/packages`, {
    query: { zone_id: zoneId },
    auth: false,
  });

/** Busy intervals of a PC for one club-local day (`YYYY-MM-DD`). */
export const getPcAvailability = (pcId: string, date: string) =>
  api<PcAvailability>('GET', `/v1/pcs/${pcId}/availability`, { query: { date }, auth: false });

// --- bookings ---

export const createBooking = (body: Schemas['BookingCreate']) =>
  api<Booking>('POST', '/v1/bookings', { body });

export const listBookings = (cursor?: string | null) =>
  api<BookingPage>('GET', '/v1/bookings', { query: { cursor, limit: 20 } });

export const getBooking = (bookingId: string) =>
  api<Booking>('GET', `/v1/bookings/${bookingId}`);

export const cancelBooking = (bookingId: string) =>
  api<Booking>('POST', `/v1/bookings/${bookingId}/cancel`);

// --- payments ---

/** Replaying the same `idempotencyKey` returns the original payment instead of a second one. */
export const createPayment = (bookingId: string, method: PaymentMethod, idempotencyKey: string) =>
  api<Payment>('POST', `/v1/bookings/${bookingId}/payments`, {
    body: { method },
    headers: { 'Idempotency-Key': idempotencyKey },
  });

/**
 * Development only: asks the mock provider to send its webhook. The booking is still confirmed
 * by that webhook on the server, never by this app.
 */
export const simulateMockPayment = (paymentId: string, outcome: 'complete' | 'fail') =>
  api<Payment>('POST', `/v1/payments/mock/${paymentId}/${outcome}`);

// --- qr unlock ---

export interface QrUnlockPayload {
  pc_id: string;
  qr_token: string;
  duration_minutes?: number;
  tariff_id?: string;
  username?: string;
}

export const qrUnlockPc = (payload: QrUnlockPayload) =>
  api<{ ok: boolean; detail: string; data?: unknown }>('POST', '/v1/pc/qr-unlock', {
    body: payload,
    auth: false,
  });
