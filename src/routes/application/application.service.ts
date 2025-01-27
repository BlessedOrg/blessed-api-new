import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateApplicationDto } from "@/routes/application/dto/create-application.dto";
import slugify from "slugify";
import { generateRandomLightColor } from "@/utils/colors";
import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { createVaultStripeKeysItem, deleteVaultStripeKeysItem, getVaultItem, updateVaultStripeKeysItem } from "@/lib/1pwd-vault";

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

  async setStripeKeys(appId: string, stripeSecretKey: string, stripeWebhookSecret: string) {
    try {
      const app = await this.database.app.findUnique({ where: { id: appId } });
      const vaultItem = await createVaultStripeKeysItem(stripeSecretKey, stripeWebhookSecret, app.slug);
      await this.database.app.update({
        where: { id: appId },
        data: { stripeKeysVaultKey: vaultItem.id }
      });
      return { message: "Stripe keys set successfully" };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async getStripeKeys(appId: string) {
    try {
      const app = await this.getAppWithStripeKeys(appId);
      const vaultItem = await getVaultItem(app.stripeKeysVaultKey, "stripeKeys");
      const stripeKeys = vaultItem.fields;

      return stripeKeys
        ?.filter(item => item.type === "CONCEALED" && item.value)
        ?.reduce((result, item) => {
          result[item.id] = item.value;
          return result;
        }, {});

    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async updateStripeKeys(appId: string, stripeSecretKey: string, stripeWebhookSecret: string) {
    try {
      const app = await this.getAppWithStripeKeys(appId);
      await updateVaultStripeKeysItem(app.stripeKeysVaultKey, stripeSecretKey, stripeWebhookSecret);
      return { message: "Stripe keys updated successfully" };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async deleteStripeKeys(appId: string) {
    try {
      const app = await this.getAppWithStripeKeys(appId);
      await deleteVaultStripeKeysItem(app.stripeKeysVaultKey);
      await this.database.app.update({
        where: { id: appId },
        data: { stripeKeysVaultKey: null }
      });
      return { message: "Stripe keys deleted successfully" };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  private async getAppWithStripeKeys(appId: string) {
    const app = await this.database.app.findUnique({ where: { id: appId } });
    if (!app || !app.stripeKeysVaultKey) {
      throw new Error("Stripe keys not found for this application");
    }
    return app;
  }
}