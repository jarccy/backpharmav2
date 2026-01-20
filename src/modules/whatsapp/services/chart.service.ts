import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { GetDTO } from '../../../common/dto/params-dto';

@Injectable()
export class ChartService {
    constructor(private prisma: PrismaService) { }

    async getMessageStats(params: GetDTO) {
        let filter = '';
        let join = '';
        if (params.year) filter += ` AND YEAR(m.createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(m.createdAt) = ${params.month}`;
        if (params.category) {
            join = 'LEFT JOIN templates t ON m.templateId = t.id';
            filter += ` AND t.category = '${params.category}'`;
        }

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                DATE(m.createdAt) as date,
                SUM(CASE WHEN m.fromMe = 1 THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN m.fromMe = 0 THEN 1 ELSE 0 END) as received
            FROM messages m
            ${join}
            WHERE 1=1 ${filter}
            GROUP BY DATE(m.createdAt)
            ORDER BY date ASC
            LIMIT 30;
        `);
    }

    async getStatusStats(params: GetDTO) {
        let filter = '';
        let join = '';
        if (params.year) filter += ` AND YEAR(m.createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(m.createdAt) = ${params.month}`;
        if (params.category) {
            join = 'LEFT JOIN templates t ON m.templateId = t.id';
            filter += ` AND t.category = '${params.category}'`;
        }

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                CASE 
                    WHEN m.ack = 1 THEN 'sent'
                    WHEN m.ack = 2 THEN 'delivered'
                    WHEN m.ack = 3 THEN 'read'
                    WHEN m.ack = 4 THEN 'failed'
                    ELSE 'pending'
                END as status,
                COUNT(*) as count
            FROM messages m
            ${join}
            WHERE m.fromMe = 1 ${filter}
            GROUP BY status;
        `);
    }

    async getCategoryStats(params: GetDTO) {
        let filter = '';
        if (params.year) filter += ` AND YEAR(createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(createdAt) = ${params.month}`;

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                category,
                COUNT(*) as count
            FROM messageStatus
            WHERE category IS NOT NULL AND category != '' ${filter}
            GROUP BY category;
        `);
    }

    async getCostStats(params: GetDTO) {
        let filter = '';
        if (params.year) filter += ` AND YEAR(createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(createdAt) = ${params.month}`;

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                category,
                COUNT(*) * 0.05 as estimatedCost
            FROM messageStatus
            WHERE category IS NOT NULL AND category != '' ${filter}
            GROUP BY category;
        `);
    }

    async getTemplateStats(params: GetDTO) {
        let filter = '';
        if (params.year) filter += ` AND YEAR(t.createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(t.createdAt) = ${params.month}`;

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                t.name as template,
                COUNT(m.id) as usageCount
            FROM templates t
            JOIN messages m ON m.templateId = t.id
            WHERE 1=1 ${filter}
            GROUP BY t.id, t.name
            ORDER BY usageCount DESC
            LIMIT 5;
        `);
    }

    async getTemplatePerformance(params: GetDTO) {
        let filter = '';
        if (params.year) filter += ` AND YEAR(m.createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(m.createdAt) = ${params.month}`;

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                t.name as template,
                COUNT(m.id) as total,
                SUM(CASE WHEN m.ack = 3 THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN m.ack = 2 THEN 1 ELSE 0 END) as delivered_count,
                ROUND((SUM(CASE WHEN m.ack = 3 THEN 1 ELSE 0 END) / COUNT(m.id)) * 100, 1) as read_rate
            FROM templates t
            JOIN messages m ON m.templateId = t.id
            WHERE 1=1 ${filter}
            GROUP BY t.id, t.name
            ORDER BY total DESC
            LIMIT 10;
        `);
    }

    async getTemplateTrends(params: GetDTO) {
        let filter = '';
        if (params.year) filter += ` AND YEAR(m.createdAt) = ${params.year}`;
        if (params.month) filter += ` AND MONTH(m.createdAt) = ${params.month}`;

        return this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                DATE(m.createdAt) as date,
                t.name as template,
                COUNT(m.id) as count
            FROM templates t
            JOIN messages m ON m.templateId = t.id
            WHERE 1=1 ${filter}
            GROUP BY DATE(m.createdAt), t.id, t.name
            ORDER BY date ASC;
        `);
    }
}
