import { Module } from '@nestjs/common';
import { ChatbotController, MobileChatController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  controllers: [ChatbotController, MobileChatController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
