import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceGateway } from './device.gateway';
import { v4 as uuidv4 } from 'uuid';
import { CommandType, CommandStatus } from '@sentinel/shared-types';
import { Command } from '../../database/entities/command.entity';
import { CommandResult } from '../../database/entities/command-result.entity';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class CommandExecutionService {
  private readonly logger = new Logger(CommandExecutionService.name);

  constructor(
    @Inject(forwardRef(() => DeviceGateway))
    private readonly deviceGateway: DeviceGateway,
    private readonly redisService: RedisService,
    @InjectRepository(Command) private readonly commandRepo: Repository<Command>,
    @InjectRepository(CommandResult) private readonly commandResultRepo: Repository<CommandResult>,
  ) {}

  async issueCommand(deviceId: string, type: CommandType, payload: any, issuedBy: string, organizationId: string) {
    if (!Object.values(CommandType).includes(type)) {
      this.logger.error(`Zero Arbitrary Shell execution constraint violation detected: ${type}`);
      throw new BadRequestException('Zero Arbitrary Shell execution constraint: Invalid or unsafe command type.');
    }

    const commandId = uuidv4();

    const commandRecord = this.commandRepo.create({
      id: commandId,
      deviceId,
      type,
      payload,
      issuedBy,
      organizationId,
      status: CommandStatus.PENDING,
      issuedAt: new Date(),
    });
    await this.commandRepo.save(commandRecord);

    const sent = this.deviceGateway.sendCommandToDevice(deviceId, commandId, type, payload);
    
    if (!sent) {
      commandRecord.status = CommandStatus.FAILED;
      await this.commandRepo.save(commandRecord);
      throw new NotFoundException(`Device ${deviceId} is not connected.`);
    }

    await this.redisService.set(`command:timeout:${commandId}`, 'PENDING', 15);

    return commandRecord;
  }

  async handleCommandResult(commandId: string, resultData: any, executionTimeMs: number) {
    const commandRecord = await this.commandRepo.findOne({ where: { id: commandId } });
    if (!commandRecord) {
      this.logger.warn(`Command result received for unknown command: ${commandId}`);
      return;
    }

    commandRecord.status = CommandStatus.COMPLETED;
    commandRecord.completedAt = new Date();
    await this.commandRepo.save(commandRecord);

    const resultRecord = this.commandResultRepo.create({
      commandId,
      deviceId: commandRecord.deviceId,
      status: CommandStatus.COMPLETED,
      result: resultData,
      executionTimeMs,
      receivedAt: new Date(),
    });
    await this.commandResultRepo.save(resultRecord);

    await this.redisService.del(`command:timeout:${commandId}`);

    if (this.deviceGateway.server) {
      this.deviceGateway.server.emit(`dashboard.command.result.${commandRecord.organizationId}`, {
        commandId,
        deviceId: commandRecord.deviceId,
        resultData,
        executionTimeMs,
      });
    }
  }
}
