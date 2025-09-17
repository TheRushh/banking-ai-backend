import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import type { Request as ExpressRequest }             from 'express';
import { AuthService }                                from './auth.service';
import { UsersService }                               from '../users/users.service';
import { LocalAuthGuard }                             from './local-auth.guard';

interface LoginRequest extends ExpressRequest {
  user: { _id: any; email: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string }
  ) {
    const user: any = await this.usersService.create(body.email, body.password);
    return {
      userId: user._id.toString(),
      email:  user.email
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: LoginRequest
  ) {
    return this.authService.login(req.user);
  }
}
