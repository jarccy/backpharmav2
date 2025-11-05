import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';
// import { Role } from 'src/common/enums/role.enum';

export class CreateParentDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(1)
  description: string;
}
