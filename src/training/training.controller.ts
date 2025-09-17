import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard }                            from '../common/guards/jwt-auth.guard';
import { TrainingService }                         from './training.service';

@Controller('training')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(private svc: TrainingService) {}

  @Post('start')
  start() {
    return this.svc.start();
  }

  @Get('status/:jobArn')
  status(@Param('jobArn') jobArn: string) {
    return this.svc.status(jobArn);
  }
}
