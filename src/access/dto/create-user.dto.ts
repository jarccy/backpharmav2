import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
// import { Role } from 'src/common/enums/role.enum';

export class CreateUserDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(4)
  password: string;

  whatsappId?: number | null;

  @IsNumber()
  roleId: number;

  @IsNumber()
  @IsOptional()
  countryId?: number | null;

  @IsBoolean()
  status: boolean;
}
