import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../../../../generated/prisma';
import type { AuthenticatedUser } from '../../auth.types';
import { RequireRoles } from '../decorators/require-roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows routes without role metadata', () => {
    const context = createContext({ user: userWithRole(UserRole.CASHIER) });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows matching roles', () => {
    class Controller {
      @RequireRoles(UserRole.ADMIN, UserRole.OWNER)
      route(): void {}
    }

    const context = createContext({
      handler: Controller.prototype.route,
      controller: Controller,
      user: userWithRole(UserRole.OWNER),
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects non-matching roles', () => {
    class Controller {
      @RequireRoles(UserRole.ADMIN)
      route(): void {}
    }

    const context = createContext({
      handler: Controller.prototype.route,
      controller: Controller,
      user: userWithRole(UserRole.CASHIER),
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

function createContext(input: {
  handler?: () => void;
  controller?: object;
  user?: AuthenticatedUser;
}): ExecutionContext {
  return ({
    getHandler: () => input.handler ?? (() => undefined),
    getClass: () => input.controller ?? class AnonymousController {},
    switchToHttp: () => ({
      getRequest: () => ({ user: input.user }),
    }),
  } as unknown) as ExecutionContext;
}

function userWithRole(role: UserRole): AuthenticatedUser {
  return {
    id: 'user_1',
    email: 'user@gastroai.local',
    fullName: 'Test User',
    role,
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    sessionId: 'session_1',
  };
}
