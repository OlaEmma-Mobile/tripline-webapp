import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import { DriverKycRecord } from '../auth/auth.types';


/**
 * Repository for driver KYC persistence.
 */
export class DriverKycRepository {
  /** Create or replace a driver's KYC record. */
  async upsertDriverKyc({
    userId,
    licenseNumber,
    ninBvnNid,
  }: {
    userId: string;
    licenseNumber: string;
    ninBvnNid: string;
  }): Promise<DriverKycRecord> {
    const { data, error } = await supabaseAdmin
      .from('driver_kyc')
      .upsert({
        user_id: userId,
        license_number: licenseNumber,
        nin_bvn_nid: ninBvnNid,
        status: 'pending',
      })
      .select('*')
      .single<DriverKycRecord>();

    if (error || !data) {
      throw new AppError('Unable to submit KYC', 500);
    }
    return data;
  }
}

export const driverKycRepository = new DriverKycRepository();
