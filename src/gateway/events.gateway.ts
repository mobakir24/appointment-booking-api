import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

/** namespace الافتراضي "/" والمسار /socket.io. لا يستقبل أحداثًا من العميل. */
@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer() server: Server;

  slotBooked(slotId: string, bookingId: string) {
    this.server.emit('slot.booked', { slotId, bookingId, available: false });
  }
  slotReleased(slotId: string, bookingId: string) {
    this.server.emit('slot.released', { slotId, bookingId, available: true });
  }
}
