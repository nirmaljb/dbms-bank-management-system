export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  staffId: string | null;
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
}
