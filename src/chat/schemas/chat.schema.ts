import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document }                    from 'mongoose';

export type ChatDocument = ChatMessage & Document;

@Schema()
export class ChatMessage {
  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  userId:    string;

  // allow the function‐call role as well:
  @Prop({ 
    required: true,
    enum: ['user','assistant','function'] 
  })
  role:     'user' | 'assistant' | 'function';

  // only functions carry a name
  @Prop()
  name?:    string;

  @Prop({ required: true })
  text:     string;
}

export const ChatSchema = SchemaFactory.createForClass(ChatMessage);
