import { CampaignType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, ValidateIf, ValidateNested } from 'class-validator';

class TicketIdDto {
  @IsNotEmpty()
  ticketId: string;

  @IsNotEmpty() 
  eventId: string;
}

class RewardIdDto {
  @IsNotEmpty()
  rewardId: string;

  @IsOptional()
  eventId?: string;
}

export class SaveCampaignDto {
  @IsEnum(CampaignType)
  @IsNotEmpty()
  campaignType: CampaignType;

  @ValidateIf(o => o.campaignType === CampaignType.TICKET)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketIdDto)
  @IsNotEmpty()
  ticketsIds: TicketIdDto[];

  @ValidateIf(o => o.campaignType === CampaignType.REWARD) 
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RewardIdDto)
  @IsNotEmpty()
  rewardsIds: RewardIdDto[];
}