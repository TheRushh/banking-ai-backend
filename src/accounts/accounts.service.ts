import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel }                   from '@nestjs/mongoose';
import { Model }                         from 'mongoose';
import { Account, AccountDocument }     from './schemas/account.schema';

export interface SimpleAccount {
  type:          string;
  balance:       number;
  accountNumber: string;
}

@Injectable()
export class AccountsService {
  constructor(@InjectModel(Account.name) private acctModel: Model<AccountDocument>) {}

  async getBalance(
    userId: string,
    type: 'checking' | 'savings' | 'credit',
    accountNumber?: string
  ): Promise<number> {
    // build the query
    const query: Record<string, unknown> = { userId, type };
    if (accountNumber) {
      query.accountNumber = accountNumber;
    }

    const acct = await this.acctModel.findOne(query);
    if (!acct) {
      const what = accountNumber
        ? `No ${type} account found with number ending in ${accountNumber.slice(-4)}`
        : `No ${type} account found`;
      throw new NotFoundException(what);
    }
    return acct.balance;
  }

  async transfer(
    userId:        string,
    fromAccount:   string,
    toAccount:     string,
    amount:        number
  ): Promise<void> {
    const src = await this.acctModel.findOne({ userId, accountNumber: fromAccount });
    const dst = await this.acctModel.findOne({ userId, accountNumber: toAccount });
    if (!src || !dst) throw new NotFoundException('Account not found');
    if (src.balance < amount) throw new BadRequestException('Insufficient funds');
    // do the transfer
    src.balance -= amount;
    dst.balance += amount;
    await Promise.all([src.save(), dst.save()]);
  }

  /**
   * List all accounts (type, balance, accountNumber) for a user
   */
  async listAccounts(userId: string): Promise<SimpleAccount[]> {
    // we stored userId as a string in the schema
    const filter = { userId };

    // project only the fields we care about, and drop _id
    const accts = await this.acctModel
      .find(filter)
      .select({ _id: 0, type: 1, balance: 1, accountNumber: 1 })
      .lean<SimpleAccount>();  

    if (!(accts as any).length) {
      throw new NotFoundException(`No accounts found for user ${userId}`);
    }

    return accts as any;
  }
}
