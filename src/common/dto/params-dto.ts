import { IsOptional, IsString } from 'class-validator';

export class GetDTO {
  @IsOptional()
  @IsString()
  search?: string;

  perPage?: string;
  page?: string;

  country?: number | null;
  gender?: number | null;
  department?: string | null;
  city?: string | null;
  birthDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;

  branch?: number | null;
  incriptionDate?: string | null;

  year?: string | null;
  month?: string | null;
  category?: string | null;
}
