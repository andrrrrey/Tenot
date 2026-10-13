import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class PhoneRequestDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,64}$/)
  deviceId?: string;
}

export class PhoneVerifyDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @Length(4, 8)
  @Matches(/^\d+$/)
  code!: string;
}
