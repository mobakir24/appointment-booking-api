import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiError } from './api-error';

/** يوحّد صيغة كل الأخطاء: {"error":{"code","message"}} دون كشف تفاصيل داخلية. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ApiError) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    // أخطاء 4xx من Nest أو من body-parser (مثل JSON غير صالح)
    const status: number | undefined =
      exception instanceof HttpException ? exception.getStatus() : exception?.status ?? exception?.statusCode;

    if (typeof status === 'number' && status >= 400 && status < 500) {
      if (status === 400) {
        return res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or malformed request.' } });
      }
      if (status === 404) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
      }
      return res.status(status).json({ error: { code: 'REQUEST_ERROR', message: 'Request could not be processed.' } });
    }

    this.logger.error(exception?.stack ?? String(exception));
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  }
}
