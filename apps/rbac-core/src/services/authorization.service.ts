import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AuthorizationRequest,
  AuthorizationResult,
  Policy,
  PolicyCondition,
  PolicyEffect,
  PolicySimulationRequest,
  PolicySimulationResult,
  PolicyStatement,
  User,
} from '@lib/common';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    this.logger.debug(`Authorization request: ${JSON.stringify(request)}`);

    try {
      // Get user with roles and policies
      const user = await this.userRepository.findOne({
        where: { id: request.userId, tenantId: request.tenantId },
        relations: ['roles', 'roles.policies'],
      });

      if (!user) {
        return {
          allowed: false,
          reason: 'User not found or does not belong to tenant',
          evaluatedPolicies: [],
          decision: PolicyEffect.DENY,
        };
      }

      // Get all applicable policies
      const policies = await this.getApplicablePolicies(
        request.userId,
        request.tenantId,
        request.resource,
      );

      // Evaluate policies
      const evaluationResult = this.evaluatePolicies(
        policies,
        request.action,
        request.resource,
        request.context ?? {},
      );

      this.logger.debug(`Authorization result: ${JSON.stringify(evaluationResult)}`);
      return evaluationResult;
    } catch (error) {
      this.logger.error(`Authorization error: ${(error as Error).message}`, (error as Error).stack);
      return {
        allowed: false,
        reason: 'Internal error during authorization',
        evaluatedPolicies: [],
        decision: PolicyEffect.DENY,
      };
    }
  }

  async simulatePolicy(request: PolicySimulationRequest): Promise<PolicySimulationResult> {
    const results: PolicySimulationResult['results'] = [];

    // Get all applicable policies for the user
    const policies = await this.getApplicablePolicies(request.userId, request.tenantId);

    // Test each action-resource combination
    for (const action of request.actions) {
      for (const resource of request.resources) {
        const evaluation = this.evaluatePolicies(policies, action, resource, request.context ?? {});

        results.push({
          action,
          resource,
          allowed: evaluation.allowed,
          reason: evaluation.reason,
          matchedPolicies: evaluation.evaluatedPolicies,
        });
      }
    }

    return {
      request,
      results,
    };
  }

  private async getApplicablePolicies(
    userId: string,
    tenantId: string,
    resource?: string,
  ): Promise<Policy[]> {
    const queryBuilder = this.policyRepository
      .createQueryBuilder('policy')
      .leftJoin('policy.user', 'user')
      .leftJoin('policy.role', 'role')
      .leftJoin('role.users', 'roleUsers')
      .where('policy.tenantId = :tenantId', { tenantId })
      .andWhere('policy.active = true')
      .andWhere('(policy.userId = :userId OR (role.id IS NOT NULL AND roleUsers.id = :userId))', {
        userId,
      });

    // If resource is specified, we might want to filter policies further
    // This is a simplified version - in production, you'd want more sophisticated ARN matching
    if (resource) {
      queryBuilder.andWhere(
        `(
          policy.document::text LIKE :resourcePattern OR
          policy.document->'statement'->0->>'resource' LIKE :resourcePattern
        )`,
        { resourcePattern: `%${resource}%` },
      );
    }

    return queryBuilder.getMany();
  }

  private evaluatePolicies(
    policies: Policy[],
    action: string,
    resource: string,
    context: Record<string, unknown>,
  ): AuthorizationResult {
    const evaluatedPolicies: string[] = [];
    let hasExplicitAllow = false;
    let hasExplicitDeny = false;
    let denyReason = '';
    let allowReason = '';

    for (const policy of policies) {
      evaluatedPolicies.push(policy.name);

      for (const statement of policy.document.statement) {
        const statementEvaluation = this.evaluateStatement(statement, action, resource, context);

        if (statementEvaluation.matches) {
          if (statement.effect === PolicyEffect.DENY) {
            hasExplicitDeny = true;
            denyReason = `Denied by policy "${policy.name}": ${statementEvaluation.reason}`;
          } else {
            // Must be PolicyEffect.ALLOW since enum only has DENY and ALLOW
            hasExplicitAllow = true;
            allowReason = `Allowed by policy "${policy.name}": ${statementEvaluation.reason}`;
          }
        }
      }
    }

    // AWS IAM evaluation logic: Explicit deny overrides everything
    if (hasExplicitDeny) {
      return {
        allowed: false,
        reason: denyReason,
        evaluatedPolicies,
        decision: PolicyEffect.DENY,
      };
    }

    // If there's an explicit allow and no deny, allow
    if (hasExplicitAllow) {
      return {
        allowed: true,
        reason: allowReason,
        evaluatedPolicies,
        decision: PolicyEffect.ALLOW,
      };
    }

    // Default deny if no explicit allow
    return {
      allowed: false,
      reason: 'No explicit allow policy found - default deny',
      evaluatedPolicies,
      decision: PolicyEffect.DENY,
    };
  }

  private evaluateStatement(
    statement: PolicyStatement,
    action: string,
    resource: string,
    context: Record<string, unknown>,
  ): { matches: boolean; reason: string } {
    // Check if action matches
    const actionMatches = this.matchesPattern(statement.action, action);
    if (!actionMatches) {
      return {
        matches: false,
        reason: `Action "${action}" does not match statement actions`,
      };
    }

    // Check if resource matches
    const resourceMatches = this.matchesPattern(statement.resource, resource);
    if (!resourceMatches) {
      return {
        matches: false,
        reason: `Resource "${resource}" does not match statement resources`,
      };
    }

    // Check conditions if present
    if (statement.condition) {
      const conditionMatches = this.evaluateConditions(statement.condition, context);
      if (!conditionMatches) {
        return {
          matches: false,
          reason: 'Statement conditions not met',
        };
      }
    }

    return {
      matches: true,
      reason: 'Statement matches request',
    };
  }

  private matchesPattern(patterns: string[], value: string): boolean {
    return patterns.some(pattern => {
      // Simple wildcard matching - in production, you'd want more sophisticated ARN matching
      if (pattern === '*') {
        return true;
      }
      if (pattern === value) {
        return true;
      }

      // Convert wildcard pattern to regex
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(value);
    });
  }

  private evaluateConditions(
    conditions: PolicyCondition,
    context: Record<string, unknown>,
  ): boolean {
    for (const [operator, condition] of Object.entries(conditions)) {
      for (const [key, expectedValue] of Object.entries(
        condition as Record<string, string | string[] | number | boolean>,
      )) {
        const contextValue = this.getContextValue(key, context);

        if (!this.evaluateCondition(operator, contextValue, expectedValue)) {
          return false;
        }
      }
    }
    return true;
  }

  private getContextValue(key: string, context: Record<string, unknown>): unknown {
    // Support nested key access with dot notation
    const keys = key.split('.');
    let value: unknown = context;

    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private evaluateCondition(
    operator: string,
    contextValue: unknown,
    expectedValue: unknown,
  ): boolean {
    switch (operator) {
      case 'StringEquals':
        return contextValue === expectedValue;
      case 'StringLike':
        if (typeof contextValue === 'string' && typeof expectedValue === 'string') {
          const pattern = expectedValue.replace(/\*/g, '.*').replace(/\?/g, '.');
          return new RegExp(`^${pattern}$`, 'i').test(contextValue);
        }
        return false;
      case 'NumericEquals':
        return Number(contextValue) === Number(expectedValue);
      case 'NumericLessThan':
        return Number(contextValue) < Number(expectedValue);
      case 'NumericGreaterThan':
        return Number(contextValue) > Number(expectedValue);
      case 'Bool':
        return Boolean(contextValue) === Boolean(expectedValue);
      case 'StringEqualsIgnoreCase':
        return String(contextValue).toLowerCase() === String(expectedValue).toLowerCase();
      case 'IpAddress':
        // Simplified IP check - in production, you'd use proper IP libraries
        return contextValue === expectedValue;
      default:
        this.logger.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }
}
