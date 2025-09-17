import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel }                   from '@nestjs/mongoose';
import { Model, PipelineStage, Types }   from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreateTransactionDto }            from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private txModel: Model<TransactionDocument>,
  ) {}

  /** 1) Create a new transaction */
  async create(dto: CreateTransactionDto): Promise<TransactionDocument> {
    const created = await this.txModel.create({
      ...dto,
      userId: Types.ObjectId.createFromHexString(dto.userId),
      date:   dto.date ? new Date(dto.date) : new Date(),
    });
    return created;
  }

  /** 2) List all transactions for a user (optionally filter by accountType and date range) */
  async findAllForUser(
    userId:      string,
    accountType?: 'checking'|'savings'|'credit',
    from?:       Date,
    to?:         Date,
    category?: string
  ): Promise<TransactionDocument[]> {
    
    const filter: any = {
      userId: Types.ObjectId.createFromHexString(userId),
    };
    if (accountType) filter.accountType = accountType;
    if (from || to)  filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
    if (category) filter.category = category;
    return this.txModel.find(filter).sort({ date: -1 }).exec();
  }

  /** 3) Summarize spending by category in a date range */
  async spendingByCategory(
    userId: string,
    from:   Date,
    to:     Date,
    opts: {
      accountType?: 'checking' | 'savings' | 'credit';
      categories? : string[];
      minAmount   : number;    // absolute value
    } = { minAmount: 0 },
  ): Promise<{ category: string; total: number }[]> {
    const match: any = {
      userId: userId,
      date:   { $gte: from, $lte: to },
      // only spending transactions:
      amount: { $lt: 0 },
    };
    if (opts.accountType) {
      match.accountType = opts.accountType;
    }

    if (opts.categories?.length) {
      match.category = { $in: opts.categories };
    }
    console.log(match);

    const pipeline: PipelineStage[] = [
      { $match: match },

      // group by category, summing up the (negative) amounts:
      {
        $group: {
          _id:   '$category',
          total: { $sum: '$amount' },
        },
      },

      // flip sign to make totals positive again & reshape:
      {
        $project: {
          _id:      0,
          category: '$_id',
          total:    { $abs: '$total' },
        },
      },

      // sort descending by spend:
      { $sort: { total: -1 } },
    ];

    return this.txModel.aggregate(pipeline).exec();
  }
}
