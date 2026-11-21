import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module';
import { DatabaseModule } from './database/database.module';
import { GatewayModule } from './gateway/gateway.module';
import { SlotsModule } from './slots/slots.module';

@Module({ imports: [DatabaseModule, GatewayModule, SlotsModule, BookingsModule] })
export class AppModule {}
