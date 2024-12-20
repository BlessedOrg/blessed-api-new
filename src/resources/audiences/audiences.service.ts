import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import slugify from "slugify";
import { UsersService } from "@/resources/users/users.service";
import { CreateAudiencesDto } from "@/resources/audiences/dto/create-audience.dto";
import { CustomHttpException } from "@/common/exceptions/custom-error-exception";

@Injectable()
export class AudiencesService {
  constructor(
    private database: DatabaseService,
    private usersService: UsersService
  ) {}

  getAllAudiences(appId: string) {
    return this.database.audience.findMany({
      where: {
        appId,
        deletedAt: {
          equals: null
        }
      },
      include: {
        AudienceUsers: {
          include: {
            User: true
          }
        }
      }
    });
  }

  async create(createAudienceDto: CreateAudiencesDto, appId: string) {
    const slug = slugify(createAudienceDto.name, {
      lower: true,
      strict: true,
      trim: true
    });
    const createdAudience = await this.database.audience.create({
      data: { appId, name: createAudienceDto.name, slug }
    });

    await this.createOrAssignUsersToAudience(appId, createdAudience.id, createAudienceDto);

    return createdAudience;
  }

  update(
    appId: string,
    audienceId: string,
    updateAudienceDto: { name?: string }
  ) {
    try {
      if (updateAudienceDto?.name) {
        const slug = slugify(updateAudienceDto.name, {
          lower: true,
          strict: true,
          trim: true
        });
        return this.database.audience.update({
          where: { id: audienceId, appId },
          data: { name: updateAudienceDto.name, slug }
        });
      } else {
        throw new HttpException("No changes to update!", 400);
      }
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  deleteAudience(appId: string, audienceId: string) {
    return this.database.audience.update({
      where: { id: audienceId, appId },
      data: {
        deletedAt: new Date()
      }
    });
  }

  private createOrAssignUsersToAudience(
    appId: string,
    audienceId: string,
    usersToAssign: CreateAudiencesDto
  ) {
    console.log(usersToAssign);
    return this.database.$transaction(async (prisma) => {
      const { users } = await this.usersService.createManyUserAccounts(
        { users: usersToAssign?.emails || [] },
        appId
      );

      let alreadyAssignedUsers = [];
      let assignedUsers = [];
      const handleUser = async (
        userId: string | null,
        externalAddress: string | null
      ) => {
        const existingAudienceUser = await prisma.audienceUser.findFirst({
          where: externalAddress
            ? { externalWalletAddress: externalAddress }
            : { userId },
          include: { Audiences: { select: { id: true } } }
        });

        if (existingAudienceUser) {
          if (
            existingAudienceUser.Audiences.some(
              (audience) => audience.id === audienceId
            )
          ) {
            alreadyAssignedUsers.push(existingAudienceUser);
            return;
          }
          assignedUsers.push(existingAudienceUser);
          return prisma.audienceUser.update({
            where: { id: existingAudienceUser.id },
            data: {
              Audiences: {
                connect: { id: audienceId }
              }
            }
          });
        } else {
          return prisma.audienceUser.create({
            data: {
              userId,
              externalWalletAddress: externalAddress,
              Audiences: {
                connect: { id: audienceId }
              }
            }
          });
        }
      };

      const createdUsersAudience = await Promise.all(
        users.map((user) => handleUser(user.id, null))
      );

      const externalAudienceUsers = await Promise.all(
        usersToAssign.externalAddresses.map((address) =>
          handleUser(null, address)
        )
      );

      const assignedExistingUsersAudience = await Promise.all(
        usersToAssign.userIds.map((userId) => handleUser(userId, null))
      );

      return {
        message: "Successfully created and assigned audience users",
        alreadyAssignedUsers,
        createdUsersAudience,
        externalAudienceUsers,
        assignedExistingUsersAudience
      };
    });
  }
}
