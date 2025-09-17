import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import type { Request as ExpressRequest }             from 'express';
import { JwtAuthGuard }                              from '../common/guards/jwt-auth.guard';
import { ChatService }                               from './chat.service';
import { v4 as uuidv4 }                              from 'uuid';

interface ChatRequest extends ExpressRequest {
  user: { userId: string };
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async chat(
    @Request() req: ChatRequest,
    @Body() body: { sessionId?: string; message: string }
  ) {
    // generate a new UUID if none was provided
    const sessionId = body.sessionId ?? uuidv4();

    // call your service with the typed userId
    const { reply, done } = await this.chatService.handleChat(
      req.user.userId,
      sessionId,
      body.message
    );

    return { sessionId, reply, done };
  }
}
