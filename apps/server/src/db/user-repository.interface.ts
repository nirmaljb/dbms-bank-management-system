export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  staffId: string | null;
  // Hash of the transaction PIN; null while the user has the default PIN.
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** What a customer fills in on the registration form, besides login details. */
export interface CustomerApplication {
  phone: string;
  dateOfBirth: string;
  address: string;
  branchCode: string;
  accountType: 'SAVINGS' | 'CURRENT';
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: 'customer' | 'admin';
  application?: CustomerApplication;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findByStaffId(staffId: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  /** Stores a new PIN hash (null restores the default PIN) and clears any lock. */
  setPinHash(id: string, pinHash: string | null): Promise<void>;
  /** Counts a wrong PIN; on the `maxAttempts`th in a row, locks the PIN for `lockMinutes`. */
  recordPinFailure(id: string, maxAttempts: number, lockMinutes: number): Promise<{ attemptsLeft: number; lockedUntil: Date | null }>;
  clearPinFailures(id: string): Promise<void>;
}
