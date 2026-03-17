import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNumber()
  listingId!: number;

  @IsNumber()
  receiverId!: number;

  @IsOptional()
  @IsString()
  text?: string;
}
