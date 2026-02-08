import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateListingDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  article?: string;

  @IsString()
  description!: string;

  @IsNumber()
  price!: number;

  @IsNumber()
  categoryId!: number;
}
