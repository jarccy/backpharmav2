import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { GetDTO } from '../common/dto/params-dto';
import { CalendarService } from './calendar.service';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { StoreCalendarDto } from './dto/store-calendar.dto';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';

@UseGuards(AuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) { }

  @Get()
  findAll(@Query() dto: GetDTO) {
    return this.calendarService.findAll(dto);
  }

  @Get(':id')
  getPatientCalendarId(@Param('id') id: string) {
    return this.calendarService.getPatientCalendarId(+id);
  }

  @Post()
  createCalendar(
    @ActiveUser() user: UserActiveI,
    @Body() createCalendarDto: StoreCalendarDto,
  ) {
    return this.calendarService.storeCalendar(+user.id, createCalendarDto);
  }

  @Put(':id')
  updateCalendar(
    @ActiveUser() user: UserActiveI,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDto,
  ) {
    return this.calendarService.updateCalendar(+user.id, +id, dto);
  }

  @Get('calendar/notifications')
  getNotifications() {
    return this.calendarService.getNotifications();
  }
}
