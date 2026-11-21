import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingEnvelopeDto, ErrorResponseDto } from '../common/dto';
import { ApiError } from '../common/api-error';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './create-booking.dto';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () => new ApiError(400, 'VALIDATION_ERROR', 'bookingId must be a valid UUID.'),
});

const err = (status: number, code: string, message: string) => ({
  status,
  description: code,
  type: ErrorResponseDto,
  content: { 'application/json': { example: { error: { code, message } } } },
});

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking',
    description:
      'Books an available slot. Under concurrent requests for the same slot exactly one returns 201 and the others 409 (enforced by a partial unique index in PostgreSQL). Emits Socket.IO `slot.booked` after commit. No authentication.',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, type: BookingEnvelopeDto, description: 'Booking created' })
  @ApiResponse(err(400, 'VALIDATION_ERROR', 'Invalid or malformed request.'))
  @ApiResponse(err(404, 'SLOT_NOT_FOUND', 'Slot not found.'))
  @ApiResponse(err(409, 'SLOT_UNAVAILABLE', 'This slot already has an active booking.'))
  @ApiResponse(err(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'))
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  @Delete(':bookingId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Cancels an active booking and frees the slot (emits `slot.released`). Idempotent: cancelling an already cancelled booking returns 200 with the same booking, unchanged, and emits no event. Cancelled bookings stay addressable by id. No authentication.',
  })
  @ApiParam({ name: 'bookingId', format: 'uuid', example: '22222222-2222-4222-8222-222222222222' })
  @ApiResponse({ status: 200, type: BookingEnvelopeDto, description: 'Booking cancelled (or already cancelled)' })
  @ApiResponse(err(400, 'VALIDATION_ERROR', 'bookingId must be a valid UUID.'))
  @ApiResponse(err(404, 'BOOKING_NOT_FOUND', 'Booking not found.'))
  @ApiResponse(err(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'))
  cancel(@Param('bookingId', uuidPipe) bookingId: string) {
    return this.bookings.cancel(bookingId);
  }
}
