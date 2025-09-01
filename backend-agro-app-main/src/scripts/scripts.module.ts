import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScriptRunnerService } from './script-runner.service';

@Module({
  imports: [TypeOrmModule],
  providers: [ScriptRunnerService],
})
export class ScriptsModule {}