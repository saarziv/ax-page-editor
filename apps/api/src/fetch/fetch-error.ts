import { HttpException, HttpStatus } from '@nestjs/common';
import type { FetchErrorCode } from '@ax/core';

const STATUS_BY_CODE: Record<FetchErrorCode, HttpStatus> = {
  INVALID_URL: HttpStatus.BAD_REQUEST,
  BLOCKED: HttpStatus.FORBIDDEN,
  NOT_HTML: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  TOO_LARGE: HttpStatus.PAYLOAD_TOO_LARGE,
  TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
  UNREACHABLE: HttpStatus.BAD_GATEWAY,
};

/** Why a page couldn't be loaded. An HttpException, so Nest sends it as `{ code, message }` with no filter. */
export class FetchError extends HttpException {
  constructor(
    readonly code: FetchErrorCode,
    message: string,
  ) {
    super({ code, message }, STATUS_BY_CODE[code]);
  }
}
