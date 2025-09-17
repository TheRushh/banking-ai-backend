import { Module }                  from '@nestjs/common';
import { MongooseModule }          from '@nestjs/mongoose';
import { ChatMessage, ChatSchema } from './schemas/chat.schema';
import { ChatService }             from './chat.service';
import { ChatController }          from './chat.controller';
import { AccountsModule }          from '../accounts/accounts.module';
import { TransactionsModule } from '../transaction/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ChatMessage.name, schema: ChatSchema }]),
    AccountsModule,
    TransactionsModule
  ],
  providers: [ChatService],
  controllers: [ChatController]
})
export class ChatModule {}
