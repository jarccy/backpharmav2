import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  roleId: number;

  whatsappId?: number | null;

  @IsNumber()
  @IsOptional()
  countryId?: number | null;

  @IsBoolean()
  status: boolean;
}
