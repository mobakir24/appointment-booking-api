import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ApiError } from './common/api-error';

/** يُستخدم في main.ts وفي الاختبارات ليكون السلوك متطابقًا. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory: (errors) =>
        new ApiError(
          400,
          'VALIDATION_ERROR',
          errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ') || 'Invalid request.',
        ),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Appointment Booking API')
    .setDescription(
      'Mini booking API. No authentication. Real-time events (Socket.IO `slot.booked` / `slot.released`) are documented in the README.',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'openapi.json' });
}
