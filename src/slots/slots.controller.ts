import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto, SlotDto } from '../common/dto';
import { SlotsService } from './slots.service';

class SlotsResponseDto {
  @ApiProperty({ type: [SlotDto] }) slots: SlotDto[];
}

@ApiTags('Slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  @ApiOperation({
    summary: 'List available slots',
    description:
      'Returns only slots without an active booking, sorted by startsAt then id. No authentication, parameters or body. Returns {"slots":[]} when none are available.',
  })
  @ApiOkResponse({ type: SlotsResponseDto })
  @ApiResponse({ status: 500, type: ErrorResponseDto, description: 'INTERNAL_ERROR' })
  list() {
    return this.slots.listAvailable();
  }
}
