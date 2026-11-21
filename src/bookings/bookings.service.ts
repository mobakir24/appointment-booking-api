import { Injectable } from '@nestjs/common';
import { Prisma, Booking } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../database/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { CreateBookingDto } from './create-booking.dto';

const toDto = (b: Booking) => ({
  id: b.id,
  slotId: b.slotId,
  customerName: b.customerName,
  customerEmail: b.customerEmail,
  status: b.status,
});

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsGateway) {}

  async create(dto: CreateBookingDto) {
    const slot = await this.prisma.slot.findUnique({ where: { id: dto.slotId } });
    if (!slot) throw new ApiError(404, 'SLOT_NOT_FOUND', 'Slot not found.');

    let booking: Booking;
    try {
      // الفحص المسبق أعلاه لا يمنع السباق؛ المنع الفعلي يتم بالقيد الفريد الجزئي في PostgreSQL.
      booking = await this.prisma.booking.create({
        data: { slotId: dto.slotId, customerName: dto.customerName, customerEmail: dto.customerEmail },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ApiError(409, 'SLOT_UNAVAILABLE', 'This slot already has an active booking.');
      }
      throw e;
    }

    // يُرسل الحدث بعد اعتماد الكتابة (create تلقائيًا commit قبل الرجوع)
    this.events.slotBooked(booking.slotId, booking.id);
    return { booking: toDto(booking) };
  }

  async cancel(id: string) {
    // تحديث شرطي ذري: ينجح مرة واحدة فقط حتى لو وصل طلبا إلغاء متزامنان
    const { count } = await this.prisma.booking.updateMany({
      where: { id, status: 'active' },
      data: { status: 'cancelled' },
    });

    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');

    if (count === 1) this.events.slotReleased(booking.slotId, booking.id);
    return { booking: toDto(booking) };
  }
}
