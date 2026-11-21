#!/usr/bin/env bash
# شغّل socket-listener في طرفية أخرى ثم نفّذ هذا السكربت (يتطلب curl).
BASE=${1:-http://localhost:3000}
SLOT=00000000-0000-4000-8000-000000000001
BODY="{\"slotId\":\"$SLOT\",\"customerName\":\"Demo\",\"customerEmail\":\"demo@example.com\"}"
echo "--- طلبان متزامنان لنفس الموعد (المتوقع: 201 و409)"
curl -s -w "\n%{http_code}\n" -X POST "$BASE/bookings" -H 'Content-Type: application/json' -d "$BODY" &
curl -s -w "\n%{http_code}\n" -X POST "$BASE/bookings" -H 'Content-Type: application/json' -d "$BODY" &
wait
echo "--- للإلغاء (يُرسل slot.released): curl -X DELETE $BASE/bookings/<bookingId>"
