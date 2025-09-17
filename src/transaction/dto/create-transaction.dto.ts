import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  userId: string;

  @IsEnum(['checking','savings','credit'])
  accountType: 'checking' | 'savings' | 'credit';

  @IsNumber()
  amount: number;

  @IsString()
  category: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
