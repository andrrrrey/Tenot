import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsNumber()
  targetId!: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  satisfaction!: string;

  @IsString()
  liked!: string;

  @IsString()
  disliked!: string;

  @IsOptional()
  @IsNumber()
  listingId?: number;
}
