import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateApplicationDto } from "@/routes/application/dto/create-application.dto";
import slugify from "slugify";
import { generateRandomLightColor } from "@/utils/colors";
import { CustomHttpException } from "@/common/exceptions/custom-error-exception";

@Injectable()
export class ApplicationService {
  constructor(private database: DatabaseService) {}

  getAppOwnerData(developerId: string) {
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

  getAppDetails(appId: string) {
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

  getAppUsers(appId: string) {
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

  async createApplication(
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
      const colors = {
        color1: generateRandomLightColor(),
        color2: generateRandomLightColor()
      };
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
          colors,
          ...(description && { description }),
          ...(imageUrl && { imageUrl })
        }
      });
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  getAllDeveloperApps(developerId: string) {
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

  getAppUsers(appId: string) {
    return this.database.user.findMany({
      where: { Apps: { some: { id: appId } } }
    });
  }

  getAppDetails(appId: string) {
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