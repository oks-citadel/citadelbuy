import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';

@ApiTags('security')
@Controller('csrf')
export class CsrfController {
  @Get('token')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated and set in cookie',
    schema: {
      properties: {
        csrfToken: { type: 'string' },
      },
    },
  })
  getCsrfToken(@Res() response: Response) {
    // Generate random CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const isProduction = process.env.NODE_ENV === 'production';

    // Set token in cookie (not httpOnly so client can read it for headers)
    // IMPORTANT: For cross-origin requests (Vercel frontend to Railway backend),
    // sameSite must be 'none' to allow cookies to be sent with cross-origin requests.
    response.cookie('csrf-token', csrfToken, {
      httpOnly: false, // Client needs to read this to send in X-CSRF-Token header
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin cookies
      maxAge: 3600000, // 1 hour
    });

    // Also return token in response for client to use in headers
    return response.json({ csrfToken });
  }
}
