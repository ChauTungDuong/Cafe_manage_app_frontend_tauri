export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  name: string; // Backend trả về "name"
  email: string;
  role: UserRole;
  phone: string;
  address: string;
  avatar: string;
  gender?: string;
  birthday?: string;
  isActive: boolean;
}
