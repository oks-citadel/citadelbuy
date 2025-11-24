import { Module } from '@nestjs/common';
import { ConversationalController } from './conversational.controller';
import { ConversationalService } from './conversational.service';

@Module({
  controllers: [ConversationalController],
  providers: [ConversationalService],
  exports: [ConversationalService],
})
export class ConversationalModule {}
