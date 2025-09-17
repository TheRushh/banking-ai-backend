import { IsString, IsNumber } from 'class-validator';

export class TransferAccountDto {
  @IsString()
  fromAccount!: string;

  @IsString()
  toAccount!: string;

  @IsNumber()
  amount!: number;
}
