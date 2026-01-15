import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(1)
  description: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permissions: number[];
}
