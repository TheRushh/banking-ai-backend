import { Injectable }   from '@nestjs/common';
import { InjectModel }  from '@nestjs/mongoose';
import type { Model }   from 'mongoose';
import OpenAI          from 'openai';
import { v4 as uuid }   from 'uuid';

import { ChatDocument, ChatMessage } from './schemas/chat.schema';
import { AccountsService }           from '../accounts/accounts.service';
import { TransactionsService }       from '../transaction/transactions.service';

@Injectable()
export class ChatService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  private functions = [
    {
      name: 'get_balance',
      description: 'Returns the balance for a given account type',
      parameters: {
        type: 'object' as const,
        properties: {
          accountType: {
            type: 'string' as const,
            enum: ['checking','savings','credit'] as const,
            description: 'Which account to check',
          },
        },
        required: ['accountType'] as const,
      },
    },
    {
      name: 'get_transactions',
      description: 'Lists transactions for a user, optionally filtering by account, date range',
      parameters: {
        type: 'object' as const,
        properties: {
          accountType: { type: 'string' as const, enum: ['checking','savings','credit'] },
          from:        { type: 'string' as const, format: 'date-time' },
          to:          { type: 'string' as const, format: 'date-time' },
        },
        required: [] as const,
      },
    },
    {
      name: 'get_spending_summary',
      description: 'Returns total spending in a date range, optionally for a specific category',
      parameters: {
        type: 'object' as const,
        properties: {
          from: { type: 'string' as const, format: 'date-time', description: 'ISO start date' },
          to:   { type: 'string' as const, format: 'date-time', description: 'ISO end date' },
          category: {
            type: 'string' as const,
            description: 'Transaction category to filter by, e.g. "groceries"',
          },
        },
        required: ['from','to'] as const,
      },
    },
    {
      name: 'transfer_funds',
      description: 'Moves money from one account to another for the user.',
      parameters: {
        type: 'object' as const,
        properties: {
          fromAccount: { type: 'string' as const, description: 'Source account (last4 or id)' },
          toAccount:   { type: 'string' as const, description: 'Destination account (last4 or id)' },
          amount:      { type: 'number' as const, description: 'Amount to transfer' },
        },
        required: ['fromAccount','toAccount','amount'] as const,
      },
    },
    {
      name: 'clarify_account',
      description: 'Ask user which account (by last4) when multiple match',
      parameters: {
        type: 'object' as const,
        properties: {
          accountType: { type: 'string' as const },
          accounts: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                last4:   { type: 'string' as const },
                balance: { type: 'number' as const },
              },
              required: ['last4','balance'] as const,
            },
          },
        },
        required: ['accountType','accounts'] as const,
      },
    },
    {
      name: 'list_accounts',
      description: 'Returns the user’s accounts: type, balance & accountNumber',
      parameters: {
        type: 'object' as const,
        properties: { },
        required: [] as const,
      },
    },
  ];

  constructor(
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatDocument>,
    private accountsService: AccountsService,
    private txService:        TransactionsService,
  ) {}

  private async persistMessage(
    sessionId: string,
    userId:    string,
    role:      'user'|'assistant'|'function',
    text:      string,
    name?:     string,
  ) {
    await this.chatModel.create({ sessionId, userId, role, name, text });
  }

  async handleChat(
    userId:    string,
    sessionId: string = uuid(),
    userText:  string,
  ): Promise<{ sessionId: string; reply: string; done: boolean, action?: string | undefined; data?: any; }> {
    
    await this.persistMessage(sessionId, userId, 'user', userText);

    const seed: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `
    You are a banking assistant.  
    
    • When the user asks for “balance” you should *only* emit a function_call:
      {"name":"get_balance","arguments":"{\"accountType\":\"checking\"}"}
    
    • Do NOT attempt any account‑listing or disambiguation—that logic lives in the application.
    
    • For all other intents, call the appropriate function (get_transactions, get_spending_summary, transfer_funds).
    
    • Return *only* the function_call JSON (no extra text).`
          },
      { role: 'user', content: userText }
    ];
    

    const first = await this.openai.chat.completions.create({
      model:         process.env.FT_MODEL_ID!,
      messages:      seed,
      functions:     this.functions,
      function_call: 'auto',
    });

    const msg0 = first.choices[0].message!;
    // ─────────────────────────────────────────────────────────────
      // ✂  FALLBACK: parse JSON‐in‐content as a function call
      if (!msg0.function_call && msg0.content) {
        try {
          const j = JSON.parse(msg0.content);
          if (typeof j.name === 'string') {
            msg0.function_call = {
              name:      j.name,
              // the API expects arguments as a JSON‐string, not an object
              arguments: j.arguments ? typeof j.arguments === 'string'
                          ? j.arguments
                          : JSON.stringify(j.arguments) : {},
            };
          }
        } catch (e) {
          // not JSON → ignore
        }
      }
    // ─────────────────────────────────────────────────────────────
    let assistantReply = '';
    let done = false;
    let action: string | undefined;
    if (msg0.function_call) {
      const { name, arguments: rawArgs } = msg0.function_call;
      let callName = name;     

      const args = JSON.parse(rawArgs!);
      let resultPayload: any;

      switch (name) {
        case 'get_balance':
          const m = userText.match(/(?:ending in\s*)?(\d{2,4})$/i);
          const suffix = m?.[1];
          const allAccts = await this.accountsService.listAccounts(userId);
          const matches  = allAccts.filter(a => a.type === args.accountType);
          const match    = suffix && allAccts.find(a => a.accountNumber.endsWith(suffix));
          
          if (matches.length > 1) {
            if (match) {
              const acct = match.accountNumber;
              const bal  = await this.accountsService.getBalance(
                userId,
                args.accountType,
                acct
              );
              callName = 'get_balance';
              resultPayload = {
                accountType:    args.accountType,
                accountNumber:  acct,
                balance:        bal
              };
            } else {
              const list = matches
              .map(a => `${args.accountType} ending in ${a.accountNumber.slice(-4)})`)
              .join(', ');
            const disamb = `You have multiple ${list}. Which one would you like to check?`;
        
            // persist & return right away
            await this.persistMessage(sessionId, userId, 'assistant', disamb);
            return { sessionId, reply: disamb, done: true };
            }
          } else if (matches.length === 1) {
            // 2b) exactly one → do the balance lookup
            const acct = matches[0];
            const bal  = await this.accountsService.getBalance(
              userId,
              args.accountType,
              acct.accountNumber
            );
            callName = 'get_balance';
            resultPayload = {
              accountType:    args.accountType,
              accountNumber:  acct.accountNumber,
              balance:        bal
            };
          } else {
            // 2c) none found → error out
            throw new Error(`No ${args.accountType} account found`);
          }
          break;

        case 'get_transactions':
          const txs = await this.txService.findAllForUser(
            userId,
            args.accountType,
            args.from ? new Date(args.from) : undefined,
            args.to   ? new Date(args.to)   : undefined,
            args.category,
          );
          resultPayload = { transactions: txs };
          break;

        case 'get_spending_summary':
          const summary = await this.txService.spendingByCategory(
            userId,
            new Date(args.from),
            new Date(args.to),
            {
              categories: args.category ? [args.category] : undefined,
              minAmount: 0,
            }
          );
          resultPayload = { spendingByCategory: summary };
          break;

          case 'transfer_funds': {
            const { fromAccount, toAccount, amount } = args;
          
            const action = 'goto_transfer';
            const data   = { fromAccount, toAccount, amount };
          
            const assistantReply = JSON.stringify({ action, data });
          
            await this.persistMessage(
              sessionId,
              userId,
              'function',
              JSON.stringify(args),
              'transfer_funds'
            );
            await this.persistMessage(
              sessionId,
              userId,
              'assistant',
              assistantReply
            );
          
            return { sessionId, reply: assistantReply, done: true, action, data };
          }
          

        case 'list_accounts':
          resultPayload = {
            accounts: await this.accountsService.listAccounts(userId),
          };
          break;

          case 'clarify_account': {
            const { accountType, accounts } = args as {
              accountType: string;
              accounts: { last4: string; balance: number }[];
            };
          
            // Build a comma‑separated list:
            // “checking ending in 0983 ($2,370), 8118 ($4,634), 1036 ($4,780)”
            const list = accounts
              .map(a => `${accountType} ending in ${a.last4} ($${a.balance.toFixed(2)})`)
              .join(', ');
          
            // Compose your prompt:
            const disambiguation = 
              `You have multiple ${list}. Which one would you like to check?`;
          
            // Persist & return immediately—no further LLM call:
            await this.persistMessage(sessionId, userId, 'assistant', disambiguation);
            return { sessionId, reply: disambiguation, done: false };
          }

        default:
          throw new Error(`Unknown function: ${name}`);
      }

      // 4) persist function call + its result
      await this.persistMessage(
        sessionId,
        userId,
        'function',
        JSON.stringify(resultPayload),
        name,
      );

      // 5) feed back into LLM for final natural reply
      const followUp = await this.openai.chat.completions.create({
        model: process.env.FT_MODEL_ID!,
        messages: [
          // 1) a lightweight system prompt for friendly replies
          {
            role: 'system',
            content: 'You are a helpful banking assistant.  ' +
                     'The function below has already been run; now compose a natural language answer for the user.'
          },
          // 2) echo the original user question (for context)
          { role: 'user', content: userText },
          // 3) supply the function’s output
          {
            role: 'function',
            name: callName,
            content: JSON.stringify(resultPayload)
          },
        ],
        // explicitly tell the model not to call any more functions
        functions: this.functions,
        function_call: 'none'
      });
      assistantReply = followUp.choices[0].message!.content!;
      done = true;
    } else {
      // 6) no function required → plain assistant reply
      assistantReply = msg0.content!;
    }

    // 7) persist & return
    await this.persistMessage(sessionId, userId, 'assistant', assistantReply);
    return { sessionId, reply: assistantReply, done };
  }
}
