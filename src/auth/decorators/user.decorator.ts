import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = { userId: string; email: string; role: string };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as RequestUser;
});
