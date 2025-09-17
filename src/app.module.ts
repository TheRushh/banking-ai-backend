import { Module }         from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule }     from './auth/auth.module';
import { UsersModule }    from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { ChatModule }     from './chat/chat.module';
import { TrainingModule } from './training/training.module';
import { TransactionsModule } from './transaction/transactions.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!, {
      dbName: 'bankingchat',
    }),
    AuthModule, UsersModule, AccountsModule, ChatModule, TrainingModule,
    TransactionsModule
  ]
})
export class AppModule {}
