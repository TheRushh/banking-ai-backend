import {
    Controller,
    Get,
    Post,
    Body,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import type { Request as ExpressRequest } from 'express';
  import { JwtAuthGuard }                  from '../common/guards/jwt-auth.guard';
  import { AccountsService, SimpleAccount } from './accounts.service';
  
  interface TransferDto {
    fromAccount: string;
    toAccount:   string;
    amount:      number;
  }
  
  @Controller('accounts')
  @UseGuards(JwtAuthGuard)
  export class AccountsController {
    constructor(private readonly accountsService: AccountsService) {}
  
    /** GET /accounts */
    @Get()
    list(
      @Req() req: ExpressRequest & { user: { userId: string } }
    ): Promise<SimpleAccount[]> {
      return this.accountsService.listAccounts(req.user.userId);
    }
  
    /** POST /accounts/transfer
     *   Body: { fromAccount, toAccount, amount }
     */
    @Post('transfer')
    async transfer(
      @Req() req: ExpressRequest & { user: { userId: string } },
      @Body() body: TransferDto
    ): Promise<void> {
      await this.accountsService.transfer(
        req.user.userId,
        body.fromAccount,
        body.toAccount,
        body.amount
      );
    }
  }
  