import { IsOptional, IsString } from 'class-validator';

export class GetDTO {
  @IsOptional()
  @IsString()
  search?: string;

  perPage?: string;
  page?: string;
  country?: number | null;

  emissionDate?: string | null;
  patientId?: string | null;
  productId?: string | null;
  pharmacyId?: string | null;
  userId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}
