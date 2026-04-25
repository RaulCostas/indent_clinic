import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot/:clinicId')
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) { }

    @Get('status')
    getStatus(@Param('clinicId') clinicId: string, @Query('instance') instance?: string) {
        return this.chatbotService.getStatus(+clinicId, Number(instance) || 1);
    }

    @Post('initialize')
    async initialize(@Param('clinicId') clinicId: string, @Query('instance') instance?: string) {
        try {
            await this.chatbotService.initialize(+clinicId, Number(instance) || 1);
            return this.chatbotService.getStatus(+clinicId, Number(instance) || 1);
        } catch (error) {
            console.error(`[ChatbotController] [Clinic ${clinicId}] Error initializing:`, error);
            return {
                status: 'disconnected',
                error: error.message || 'Failed to initialize chatbot'
            };
        }
    }

    @Post('disconnect')
    async disconnect(@Param('clinicId') clinicId: string, @Query('instance') instance?: string) {
        await this.chatbotService.disconnect(+clinicId, Number(instance) || 1);
        return { status: 'disconnected' };
    }

    @Post('reset')
    async reset(@Param('clinicId') clinicId: string, @Query('instance') instance?: string) {
        await this.chatbotService.resetSession(+clinicId, Number(instance) || 1);
        return { status: 'disconnected', message: 'Session reset successfully' };
    }

    @Post('send-birthday/:id')
    async sendBirthday(@Param('clinicId') clinicId: string, @Param('id') id: string) {
        return this.chatbotService.sendBirthdayGreeting(+id, +clinicId);
    }

    @Post('send')
    async sendMessage(@Param('clinicId') clinicId: string, @Body() body: { jid: string, text: string }) {
        await this.chatbotService.sendMessage(body.jid, body.text, +clinicId);
        return { success: true };
    }

    @Post('enviar-saldo-deudor')
    async enviarSaldoDeudor(
        @Param('clinicId') clinicId: string,
        @Body() body: { pacienteId: number, instance?: number }
    ) {
        return this.chatbotService.enviarSaldoDeudor(body.pacienteId, +clinicId, body.instance || 1);
    }
}
