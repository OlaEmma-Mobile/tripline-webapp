import { AppError } from '@/lib/utils/errors';
import { hashPassword } from '@/lib/security/password';
import { walletRepository } from '@/lib/features/wallet/wallet.repository';
import { driversRepository, DriversRepository } from './drivers.repository';
import type {
  CreateDriverInput,
  DriverDTO,
  DriverManifestCountsRow,
  DriverManifestDetailDTO,
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
function mapManifestTrip(record: DriverManifestRideRow): DriverManifestDTO['trips'][number] {
  return {
    id: record.id,
    tripId: record.trip_id,
    driverTripId: record.driver_trip_id,
    rideInstanceId: record.ride_instance_id,
    rideId: record.ride_id,
    rideDate: record.ride_date,
    departureTime: record.departure_time,
    estimatedDurationMinutes: record.estimated_duration_minutes,
    timeSlot: record.time_slot,
    status: record.status,
    vehiclePlate: record.vehicle?.registration_number ?? 'Unknown vehicle',
    capacity: record.capacity,
    route: record.route
      ? {
          name: record.route.name,
          fromName: record.route.from_name,
          toName: record.route.to_name,
          fromLat: record.route.from_latitude,
          fromLng: record.route.from_longitude,
          toLat: record.route.to_latitude,
          toLng: record.route.to_longitude,
        }
      : {
          name: 'Unknown route',
          fromName: '',
          toName: '',
          fromLat: 0,
          fromLng: 0,
          toLat: 0,
          toLng: 0,
        },
    totalPassengers: 0,
    totalBoarded: 0,
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
   * Get a driver's daily manifest across scheduled/boarding trips.
   * @param driverId Driver user id.
   * @param date Ride date (YYYY-MM-DD).
   * @returns Driver manifest grouped by trip.
  */
  async getManifest(driverId: string, date: string): Promise<DriverManifestDTO> {
    const rows = await this.repo.getManifestRows(driverId, date);
    const tripIds = rows.map((row) => row.id);
    const counts = await this.repo.getManifestCounts(tripIds);
    const countsMap = new Map<string, DriverManifestCountsRow>();
    for (const row of counts) countsMap.set(row.trip_id, row);

    return {
      date,
      trips: rows.map((row) => {
        const mapped = mapManifestTrip(row);
        const rideCounts = countsMap.get(row.id);
        return {
          ...mapped,
          totalPassengers: rideCounts?.total_passengers ?? 0,
          totalBoarded: rideCounts?.total_boarded ?? 0,
        };
      }),
    };
  }

  /**
   * Get a driver's detailed manifest for a single ride instance.
   * @param driverId Driver user id.
   * @param rideInstanceId Ride instance id.
   * @returns Full manifest details with passenger list.
   */
  async getManifestDetails(
    driverId: string,
    rideInstanceId: string
  ): Promise<DriverManifestDetailDTO> {
    const details = await this.repo.getManifestDetails(driverId, rideInstanceId);
    if (!details) {
      throw new AppError('Ride instance not found', 404);
    }
    return details;
  }

  /**
   * Get a driver's detailed manifest for a single trip.
   * @param driverId Driver user id.
   * @param tripId Trip id.
   * @returns Full manifest details with passenger list.
   */
  async getManifestDetailsByTrip(
    driverId: string,
    tripId: string
  ): Promise<DriverManifestDetailDTO> {
    const details = await this.repo.getManifestDetailsByTrip(driverId, tripId);
    if (!details) {
      throw new AppError('Trip not found', 404);
    }
    return details;
  }
}

export const driversService = new DriversService(driversRepository);
