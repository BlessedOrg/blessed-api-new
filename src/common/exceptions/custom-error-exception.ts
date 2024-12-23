import { HttpException, HttpStatus } from "@nestjs/common";

export class CustomHttpException extends HttpException {
  constructor(error: any) {
    super(
      {
        status: error?.code || HttpStatus.INTERNAL_SERVER_ERROR,
        error: error?.reason || error?.message || "Internal Server Error",
        message: error?.reason || error?.message || "An unexpected error occurred",
        details: error.stack
      },
      error?.code || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
