import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './modules/access/access.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { PeopleModule } from './modules/people/people.module';
import { DataModule } from './modules/data/data.module';
import { BranchModule } from './modules/branch/branch.module';
import { CompanyModule } from './modules/company/company.module';
import { SettingModule } from './modules/setting/setting.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

@Module({
  imports: [
    CalendarModule,
    PeopleModule,
    WhatsappModule,
    AccessModule,
    AuthModule,
    DataModule,
    BranchModule,
    CompanyModule,
    SettingModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/public',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
