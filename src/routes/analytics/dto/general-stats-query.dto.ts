import { IsEnum, IsString, ValidateIf } from "class-validator";

export enum GetGeneralStatsByType {
  ALL = "all",
  DEVELOPER = "developer",
  APP = "app",
  EVENT = "event",
  TICKET = "ticket"
}

export class GeneralStatsQueryDto {
  @IsEnum(GetGeneralStatsByType)
  getBy: GetGeneralStatsByType;

  @ValidateIf(o => o.getBy === GetGeneralStatsByType.DEVELOPER)
  @IsString()
  developerId?: string;

  @ValidateIf(o => o.getBy === GetGeneralStatsByType.APP)
  @IsString()
  appId?: string;

  @ValidateIf(o => o.getBy === GetGeneralStatsByType.EVENT)
  @IsString()
  eventId?: string;

  @ValidateIf(o => o.getBy === GetGeneralStatsByType.TICKET)
  @IsString()
  ticketId?: string;
}
