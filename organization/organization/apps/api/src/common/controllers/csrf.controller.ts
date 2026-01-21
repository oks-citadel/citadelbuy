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

    // Set token in httpOnly cookie
    response.cookie('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    // Also return token in response for client to use in headers
    return response.json({ csrfToken });
  }
}
