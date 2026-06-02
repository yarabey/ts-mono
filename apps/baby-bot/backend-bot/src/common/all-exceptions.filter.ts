import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { FastifyReply } from 'fastify';

/**
 * Produces the original baby-ai error shape `{ error: "..." }` for every
 * failure, mapping HttpExceptions and Zod validation errors to the right
 * status code and logging unexpected errors.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.issues
        .map((i) => `${i.path.join('.') || 'value'}: ${i.message}`)
        .join('; ');
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const m = (res as { message?: unknown }).message;
        message = Array.isArray(m) ? m.join('; ') : String(m ?? exception.message);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    }

    reply.status(status).send({ error: message });
  }
}
