import { AppError } from '@/lib/utils/errors';
import { hashPassword } from '@/lib/security/password';
import { walletRepository } from '@/lib/features/wallet/wallet.repository';
import { isManifestPassengerStatus } from './driver-booking-auth';
import { driversRepository, DriversRepository } from './drivers.repository';
import type {
  CreateDriverInput,
  DriverDTO,
  DriverFilters,
  DriverManifestDTO,
  DriverManifestRideRow,
  DriverKycStatus,
  DriverRecord,
  UpdateDriverInput,
} from './drivers.types';

/**
 * mapDriver Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapDriver(record: DriverRecord, kycStatus: DriverKycStatus = null): DriverDTO {
  return {
    id: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    email: record.email,
    phone: record.phone,
    role: 'driver',
    emailVerified: Boolean(record.email_verified_at),
    status: record.status,
    kycStatus,
    assignedVehicle: null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * mapManifestRide Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapManifestRide(record: DriverManifestRideRow): DriverManifestDTO['rides'][number] {
  return {
    ride_instance_id: record.id,
    route_name: record.route?.name ?? 'Unknown route',
    departure_time: record.departure_time,
    vehicle_plate: record.vehicle?.registration_number ?? 'Unknown vehicle',
    passengers: (record.bookings ?? [])
      .filter((booking) => isManifestPassengerStatus(booking.status))
      .map((booking) => ({
        booking_id: booking.id,
        user_id: booking.rider_id,
        user_name: `${booking.rider?.first_name ?? ''} ${booking.rider?.last_name ?? ''}`.trim(),
        pickup_point_id: null,
        booking_status: booking.status,
      })),
  };
}

/**
 * Driver management service.
 */
export class DriversService {
  constructor(private readonly repo: DriversRepository) { }

  /** Create driver user, hash password, initialize wallet. */
  async create(input: CreateDriverInput): Promise<DriverDTO> {
    const passwordHash = await hashPassword(input.password);
    const created = await this.repo.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      status: input.status,
      passwordHash,
    });

    await walletRepository.upsertWallet(created.id, 0);
    return mapDriver(created);
  }

  /** List drivers with KYC status. */
  async list(filters: DriverFilters): Promise<{ items: DriverDTO[]; total: number }> {
    const { items, total } = await this.repo.list(filters);
    const kycMap = await this.repo.getKycByDriverIds(items.map((item) => item.id));
    const assignmentMap = await this.repo.getActiveVehicleAssignmentsByDriverIds(
      items.map((item) => item.id)
    );

    return {
      items: items.map((item) => ({
        ...mapDriver(item, kycMap[item.id] ?? null),
        assignedVehicle: assignmentMap[item.id] ?? null,
      })),
      total,
    };
  }

  /** Get a single driver with KYC status. */
  async getById(id: string): Promise<DriverDTO> {
    const driver = await this.repo.getById(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }
    const kycMap = await this.repo.getKycByDriverIds([id]);
    const assignmentMap = await this.repo.getActiveVehicleAssignmentsByDriverIds([id]);
    return {
      ...mapDriver(driver, kycMap[id] ?? null),
      assignedVehicle: assignmentMap[id] ?? null,
    };
  }

  /** Update a driver profile. */
  async update(id: string, input: UpdateDriverInput): Promise<DriverDTO> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }
    const updated = await this.repo.update(id, input);
    const kycMap = await this.repo.getKycByDriverIds([id]);
    const assignmentMap = await this.repo.getActiveVehicleAssignmentsByDriverIds([id]);
    return {
      ...mapDriver(updated, kycMap[id] ?? null),
      assignedVehicle: assignmentMap[id] ?? null,
    };
  }

  /** Soft-delete driver by status deactivation. */
  async softDelete(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }
    await this.repo.softDelete(id);
  }

  /**
   * Get a driver's daily manifest across scheduled/boarding ride instances.
   * @param driverId Driver user id.
   * @param date Ride date (YYYY-MM-DD).
   * @returns Driver manifest grouped by ride instance.
   */
  async getManifest(driverId: string, date: string): Promise<DriverManifestDTO> {
    const rows = await this.repo.getManifestRows(driverId, date);
    return {
      date,
      rides: rows.map(mapManifestRide),
    };
  }
}

export const driversService = new DriversService(driversRepository);
