import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateApplicationDto } from "@/resources/application/dto/create-application.dto";
import slugify from "slugify";

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
            name: true
          }
        },
        _count: {
          select: { Apps: true }
        }
      }
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
      }
    });
  }

  users(appId: string) {
    return this.database.user.findMany({
      where: {
        Apps: {
          some: { id: appId }
        }
      }
    });
  }
}

@Injectable()
export class ApplicationPrivateService {
  constructor(private database: DatabaseService) {}
  async create(
    createApplicationDto: CreateApplicationDto,
    developerId: string
  ) {
    try {
      const { name, imageUrl, description } = createApplicationDto;
      const slug = slugify(name, {
        lower: true,
        strict: true,
        trim: true
      });
      const existingAppWithName = await this.database.app.findFirst({
        where: {
          developerId,
          name
        }
      });
      if (existingAppWithName) {
        throw new Error("Application with this name already exists");
      }
      return this.database.app.create({
        data: {
          name,
          slug,
          developerId,
          ...(description && { description }),
          ...(imageUrl && { imageUrl })
        }
      });
    } catch (e) {
      throw new HttpException(e.message, 400);
    }
  }
  getAll(developerId: string) {
    return this.database.app.findMany({
      where: {
        developerId
      },
      include: {
        _count: {
          select: {
            Tickets: true,
            Users: true
          }
        }
      }
    });
  }
  allUsers(appId: string) {
    return this.database.user.findMany({
      where: { Apps: { some: { id: appId } } }
    });
  }
  details(appId: string) {
    return this.database.app.findUnique({
      where: {
        id: appId
      },
      include: {
        ApiTokens: {
          select: {
            id: true,
            revoked: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            Tickets: true,
            Users: true
          }
        }
      }
    });
  }
}