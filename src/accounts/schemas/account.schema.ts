import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document }                   from 'mongoose';

@Schema()
export class Account {
  // store userId as a plain string
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, enum: ['checking','savings','credit'], required: true })
  type: string;

  @Prop({ type: Number, required: true })
  balance: number;
}

export type AccountDocument = Account & Document;
export const AccountSchema = SchemaFactory.createForClass(Account);
