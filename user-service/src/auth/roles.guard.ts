// src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

     // Add null/undefined check
    if (!user || !user.roles) {
      return false;
    }

    if (!user || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User roles not found or user not authenticated');
    }

    const hasRole = user.roles.some(role => requiredRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('You do not have the required roles');
    }

    return true;
  }
}
