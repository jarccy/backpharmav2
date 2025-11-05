import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateChildDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  maintenanceId: number;

  @IsBoolean()
  status: boolean;
}
