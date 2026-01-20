import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ChartService } from './services/chart.service';
import { GetDTO } from 'src/common/dto/params-dto';

@UseGuards(AuthGuard)
@Controller('whatsapp/charts')
export class ChartController {
    constructor(private readonly chartService: ChartService) { }

    @Get('messages')
    async getMessageStats(@Query() params: GetDTO) {
        return this.chartService.getMessageStats(params);
    }

    @Get('status')
    async getStatusStats(@Query() params: GetDTO) {
        return this.chartService.getStatusStats(params);
    }

    @Get('categories')
    async getCategoryStats(@Query() params: GetDTO) {
        return this.chartService.getCategoryStats(params);
    }

    @Get('costs')
    async getCostStats(@Query() params: GetDTO) {
        return this.chartService.getCostStats(params);
    }

    @Get('templates')
    async getTemplateStats(@Query() params: GetDTO) {
        return this.chartService.getTemplateStats(params);
    }

    @Get('templates/performance')
    async getTemplatePerformance(@Query() params: GetDTO) {
        return this.chartService.getTemplatePerformance(params);
    }

    @Get('templates/trends')
    async getTemplateTrends(@Query() params: GetDTO) {
        return this.chartService.getTemplateTrends(params);
    }
}
