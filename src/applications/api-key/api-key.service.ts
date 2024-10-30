import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { JwtService } from "@nestjs/jwt";
import { envConstants } from "@/common/constants";
import { createVaultApiKeyItem, getVaultItem } from "@/lib/1pwd-vault";
import { isEqual } from "lodash";

@Injectable()
export class ApiKeyService {
  constructor(private database: DatabaseService, private jwtService: JwtService) {}
  async getApiKey(appId: string, developerId: string) {
    const app = await this.database.app.findUnique({ where: { id: appId } });

    try {
      const apiTokenRecord = await this.database.apiToken.create({
        data: {
          App: {
            connect: { id: appId }
          },
          apiTokenVaultKey: ""
        }
      });
      const apiKey = this.jwtService.sign({ appId: app.id, appSlug: app.slug, apiTokenId: apiTokenRecord?.id, developerId }, { secret: envConstants.jwtSecret });
      const vaultItem = await createVaultApiKeyItem(apiKey, app.slug);
      await this.database.apiToken.update({
        where: {
          id: apiTokenRecord?.id
        },
        data: {
          apiTokenVaultKey: vaultItem?.id as string
        }
      });
      await this.database.apiToken.updateMany({
        where: {
          appId,
          id: {
            not: apiTokenRecord?.id
          }
        },
        data: {
          revoked: true
        }
      });
      return {
        apiKey: vaultItem?.fields?.find(f => f.id === "apiKey")?.value,
        apiTokenVaultKey: vaultItem?.id,
        id: apiTokenRecord?.id
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async validateApiKey(apiKeyId: string, apiKey: string) {
    try {
      const apiToken = await this.database.apiToken.findUnique({
        where: {
          id: apiKeyId
        },
        include: {
          App: {
            include: {
              DeveloperAccount: {
                select: {
                  id: true,
                  walletAddress: true,
                  capsuleTokenVaultKey: true
                }
              }
            }
          }
        }
      });
      if (!apiToken?.id) {
        throw new Error("Invalid API Key");
      }
      const itemFromVault = await getVaultItem(apiToken?.apiTokenVaultKey, "apiKey");

      const actualApiToken = itemFromVault.fields.find(f => f.id === "apiKey").value;

      if (!isEqual(apiKey, actualApiToken)) {
        throw new Error("Invalid API Key");
      }

      return {
        developerId: apiToken.App.DeveloperAccount.id,
        appSlug: apiToken.App.slug,
        appId: apiToken.App.id,
        capsuleTokenVaultKey: apiToken.App.DeveloperAccount.capsuleTokenVaultKey,
        developerWalletAddress: apiToken.App.DeveloperAccount.walletAddress
      };
    } catch (e) {
      throw new HttpException(e.message, 401);
    }
  }
}