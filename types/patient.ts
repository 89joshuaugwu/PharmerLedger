export interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string | null;
  address: string;
  allergies: string[];
  createdAt: number;
}
