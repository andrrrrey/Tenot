import { IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export type ListingAttributeInput = string | number | boolean | string[] | null;

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

  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsNumber()
  carMakeId?: number;

  @IsOptional()
  @IsNumber()
  carModelId?: number;

  @IsOptional()
  @IsNumber()
  carYear?: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, ListingAttributeInput>;

  @IsOptional()
  @IsEnum(['PUBLISHED', 'DRAFT'])
  status?: 'PUBLISHED' | 'DRAFT';
}
