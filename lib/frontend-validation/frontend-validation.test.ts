import { describe, expect, it } from 'vitest';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import {
  adminForgotPasswordClientSchema,
  adminLoginClientSchema,
  adminResetPasswordClientSchema,
} from '@/lib/frontend-validation/admin-auth.schemas';
import { adminRouteFormClientSchema } from '@/lib/frontend-validation/admin-routes.schemas';
import {
  adminPickupPointFormClientSchema,
  adminPickupReorderClientSchema,
} from '@/lib/frontend-validation/admin-pickup-points.schemas';
import { adminRidesFilterClientSchema } from '@/lib/frontend-validation/admin-rides.schemas';
import { adminBookingRefundActionClientSchema } from '@/lib/frontend-validation/admin-bookings.schemas';
import { adminWalletAdjustmentClientSchema } from '@/lib/frontend-validation/admin-users.schemas';
import { adminVehicleFormClientSchema } from '@/lib/frontend-validation/admin-vehicles.schemas';
import {
  adminDriverAssignVehicleClientSchema,
  adminDriverCreateClientSchema,
} from '@/lib/frontend-validation/admin-drivers.schemas';
import { adminSettingsClientSchema } from '@/lib/frontend-validation/admin-settings.schemas';
import { adminTokensFilterClientSchema } from '@/lib/frontend-validation/admin-tokens.schemas';

describe('frontend validation schemas', () => {
  it('validates admin login payload', () => {
    const result = validateOrReject(adminLoginClientSchema, {
      email: 'admin@example.com',
      password: 'secret123',
    });
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid forgot password email', () => {
    const result = validateOrReject(adminForgotPasswordClientSchema, { email: 'bad-email' });
    expect(result.isValid).toBe(false);
    expect(Boolean(result.fieldErrors.email?.[0])).toBeTruthy();
  });

  it('enforces reset password confirmation match', () => {
    const result = validateOrReject(adminResetPasswordClientSchema, {
      verifyToken: 'token-value-12345',
      newPassword: 'strongpass',
      confirmPassword: 'wrongpass',
    });
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.confirmPassword?.[0]).toBe('Passwords do not match');
  });

  it('validates route form payload', () => {
    const result = validateOrReject(adminRouteFormClientSchema, {
      name: 'Lekki Morning',
      fromName: 'Lekki',
      fromLatitude: 6.44,
      fromLongitude: 3.52,
      toName: 'VI',
      toLatitude: 6.43,
      toLongitude: 3.42,
      baseTokenCost: 4,
      status: 'active',
    });
    expect(result.isValid).toBe(true);
  });

  it('rejects duplicate pickup reorder sequences', () => {
    const result = validateOrReject(adminPickupReorderClientSchema, {
      items: [
        { id: '0d2816f6-9d8d-4f0e-9732-d122911f0946', sequence: 1 },
        { id: '3f61f4d6-da0f-484f-bd27-86f4d7cecc7f', sequence: 1 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.items?.[0]).toBe('Sequence values must be unique');
  });

  it('validates pickup point form', () => {
    const result = validateOrReject(adminPickupPointFormClientSchema, {
      name: 'Chevron',
      latitude: 6.45,
      longitude: 3.55,
      sequence: 2,
      tokenModifier: 1,
    });
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid rides date', () => {
    const result = validateOrReject(adminRidesFilterClientSchema, { date: '16-02-2026' });
    expect(result.isValid).toBe(false);
  });

  it('rejects invalid refund amount', () => {
    const result = validateOrReject(adminBookingRefundActionClientSchema, {
      bookingId: 'e8516012-9f86-47c4-b113-b895fe7b6468',
      amount: 0,
      reason: 'Test',
    });
    expect(result.isValid).toBe(false);
  });

  it('rejects zero wallet adjustment', () => {
    const result = validateOrReject(adminWalletAdjustmentClientSchema, {
      userId: '39f8a42a-f5f2-43c2-9b5e-9ea5f320579f',
      amount: 0,
      reason: 'Adjustment',
    });
    expect(result.isValid).toBe(false);
  });

  it('validates vehicle form', () => {
    const result = validateOrReject(adminVehicleFormClientSchema, {
      registrationNumber: 'ABC-123',
      model: 'Toyota Hiace',
      capacity: 14,
      status: 'active',
    });
    expect(result.isValid).toBe(true);
  });

  it('requires password when creating driver', () => {
    const result = validateOrReject(adminDriverCreateClientSchema, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+2348012345678',
      password: '123',
      status: 'active',
    });
    expect(result.isValid).toBe(false);
  });

  it('validates driver-vehicle assignment IDs', () => {
    const result = validateOrReject(adminDriverAssignVehicleClientSchema, {
      driverId: '9f4cb786-52ef-4e2a-93ec-70ec084b2ca2',
      vehicleId: '2290413f-6946-4ff5-bf8a-602b19ea1a43',
    });
    expect(result.isValid).toBe(true);
  });

  it('validates settings values', () => {
    const result = validateOrReject(adminSettingsClientSchema, {
      bookingWindowDaysAhead: 7,
      cancellationWindowMinutes: 60,
      tokenExpiryDays: 30,
    });
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid token date range', () => {
    const result = validateOrReject(adminTokensFilterClientSchema, {
      from: '2026-03-01',
      to: '2026-02-01',
      status: 'success',
    });
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.to?.[0]).toBe('From date cannot be after To date');
  });
});
