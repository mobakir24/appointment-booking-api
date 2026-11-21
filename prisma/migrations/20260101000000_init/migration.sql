-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('active', 'cancelled');

-- CreateTable
CREATE TABLE "Slot" (
    "id" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Slot_ends_after_starts" CHECK ("endsAt" > "startsAt")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");

-- منع الحجز المزدوج: حجز نشط واحد فقط لكل موعد (قيد فريد جزئي)
CREATE UNIQUE INDEX "Booking_one_active_per_slot" ON "Booking"("slotId") WHERE "status" = 'active';

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
