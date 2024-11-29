import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/services/database/database.service';

@Injectable()
export class ApplicationService {
  constructor(private database: DatabaseService) {}

  getOwner(developerId: string) {
    return this.database.developer.findUnique({
      where: { id: developerId },
      include: {
        Apps: {
          select: {
            id: true,
            name: true }
        },
        _count: {
          select: { Apps: true }
        },
      },
    });
  }
  getDetails(appId: string) {
    return this.database.app.findUnique({
      where: {
        id: appId
      },
      include: {
        _count: {
          select: {
            Users: true,
            Events: true
          }
        }
      },
    });
  }

  users(appId: string) {
    return this.database.user.findMany({
      where: {
        Apps: {
          some: { id: appId }
        }
      },
    });
  }
}
