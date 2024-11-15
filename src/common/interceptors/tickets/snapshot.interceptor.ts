import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class SnapshotInterceptor implements NestInterceptor {
  constructor(private database: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest() as RequestWithDevAccessToken | RequestWithApiKey;

    return next.handle().pipe(
      map((data) => {
        const users = data?.eligibleUsers || [];
        if (!!users.length && !!request.developerId) {
          return this.transformData(request.developerId, data);
        }
        return data;
      })
    );
  }

  private async transformData(developerId: string, data: { eligibleUsers: { id: string, email: string }[], all: { id?: string, email: string }[], eligibleExternalAddresses: [] }) {
    const devApps = await this.database.app.findMany({
      where: {
        developerId
      },
      include: {
        Users: {
          select: {
            id: true
          }
        }
      }
    });
    const eligibleUsers = data?.eligibleUsers?.map(user => {
      const hidden = !devApps.some(app => app.Users.some(u => u.id === user.id));
      const { email, ...rest } = user;
      return {
        ...rest,
        email: hidden ? "hidden" : user.email
      };
    });
    return {
      ...data,
      eligibleUsers,
      all: [...eligibleUsers, ...data?.eligibleExternalAddresses]
    };
  }
}