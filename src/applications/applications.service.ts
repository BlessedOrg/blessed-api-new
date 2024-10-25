import { HttpException, Injectable } from "@nestjs/common";
import { CreateApplicationDto } from "./dto/create-application.dto";
import slugify from "slugify";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class ApplicationsService {
  constructor(private database: DatabaseService) {}
  async create(createApplicationDto: CreateApplicationDto, developerId: string) {
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
            SmartContracts: true,
            Users: true
          }
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
        ApiTokens: {
          select: {
            id: true,
            revoked: true,
            expiresAt: true
          }
        },
        _count: {
          select: {
            SmartContracts: true,
            Users: true
          }
        }
      }
    });
  }
}
