import { Controller, Post, Get, Query, Body, Param } from '@nestjs/common';
import { TransactionsService }       from './transactions.service';
import { CreateTransactionDto }      from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.txService.create(dto);
  }

  @Get('user/:userId')
  async findAllForUser(
    @Param('userId') userId: string,
    @Query('accountType') accountType?: 'checking'|'savings'|'credit',
    @Query('from') from?: string,
    @Query('to')   to?: string,
  ) {
    return this.txService.findAllForUser(
      userId,
      accountType,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    );
  }

  @Get('user/:userId/spending-by-category')
  spendingByCategory(
    @Param('userId') userId: string,

    @Query('from') from: string,
    @Query('to')   to:   string,

    @Query('accountType') accountType?: 'checking'|'savings'|'credit',
    @Query('categories')  categories?: string,   // CSV of categories
    @Query('min')         min?: number,          // min absolute spend
  ) {
    const cats = categories
      ? categories.split(',').map(s => s.trim())
      : undefined;

    return this.txService.spendingByCategory(
      userId,
      new Date(from),
      new Date(to),
      {
        accountType,
        categories: cats,
        minAmount:  min ?? 0,
      }
    );
  }
}
