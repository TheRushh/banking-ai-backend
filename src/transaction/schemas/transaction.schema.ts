import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types }             from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: String, required: true, index: true })
  userId: string;
  
  @Prop({ type: String, required: true, enum: ['checking','savings','credit'] })
  accountType: 'checking' | 'savings' | 'credit';

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: Date, default: () => new Date() })
  date: Date;

  @Prop({ type: String })
  description?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
