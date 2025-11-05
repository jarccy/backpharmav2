import { Transform } from 'class-transformer';
import {
  IsString,
  MinLength,
} from 'class-validator';

export class PassUserDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(4)
  password: string;
}
