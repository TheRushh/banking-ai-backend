import { Module }            from '@nestjs/common';
import { PassportModule }    from '@nestjs/passport';
import { JwtModule }         from '@nestjs/jwt';
import jwtConfig             from '../config/jwt.config';
import { AuthService }       from './auth.service';
import { AuthController }    from './auth.controller';
import { LocalStrategy }     from './local.strategy';
import { JwtStrategy }       from './jwt.strategy';
import { UsersModule }       from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register(jwtConfig),
    UsersModule
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController]
})
export class AuthModule {}
