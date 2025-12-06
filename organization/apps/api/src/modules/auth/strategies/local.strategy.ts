import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true, // IMPORTANT: Pass request to validate method for IP tracking
    });
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password, req);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
