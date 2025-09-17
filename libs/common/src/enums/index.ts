export enum PolicyEffect {
  ALLOW = 'Allow',
  DENY = 'Deny',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_INVITATION = 'pending_invitation',
}

export enum ResourceType {
  API_ENDPOINT = 'api_endpoint',
  DATA_OBJECT = 'data_object',
  UI_COMPONENT = 'ui_component',
  SYSTEM_RESOURCE = 'system_resource',
}

export enum AuditLogAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  PERMISSION_CHECK = 'permission_check',
  LOGIN = 'login',
  LOGOUT = 'logout',
  POLICY_EVALUATION = 'policy_evaluation',
}

export enum AuditLogResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

export enum RoleType {
  SYSTEM = 'system',
  TENANT = 'tenant',
  CUSTOM = 'custom',
}
