import { PolicyEffect, AuditLogAction, AuditLogResult } from '../enums';

export interface PolicyStatement {
  effect: PolicyEffect;
  action: string[];
  resource: string[];
  condition?: PolicyCondition;
}

export interface PolicyCondition {
  [operator: string]: {
    [key: string]: string | string[] | number | boolean;
  };
}

export interface PolicyDocument {
  version: string;
  statement: PolicyStatement[];
}

export interface AuthorizationRequest {
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  context?: Record<string, any>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  evaluatedPolicies: string[];
  decision: PolicyEffect;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId?: string;
  action: AuditLogAction;
  resource?: string;
  result: AuditLogResult;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface TenantConfig {
  maxUsers?: number;
  maxRoles?: number;
  features?: string[];
  customDomain?: string;
  settings?: Record<string, any>;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface RolePermissions {
  roleId: string;
  permissions: string[];
  resources: string[];
}

export interface ResourceHierarchy {
  resourceId: string;
  parentResourceId?: string;
  path: string;
  level: number;
}

export interface JWTPayload {
  sub: string; // user ID
  tenantId: string;
  email: string;
  roles: string[];
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface PolicySimulationRequest {
  userId: string;
  tenantId: string;
  actions: string[];
  resources: string[];
  context?: Record<string, any>;
}

export interface PolicySimulationResult {
  request: PolicySimulationRequest;
  results: {
    action: string;
    resource: string;
    allowed: boolean;
    reason: string;
    matchedPolicies: string[];
  }[];
}
