import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';

import { AuthToken, TokenType } from '../../../../libs/common/src';

@Injectable()
export class AuthTokenRepository {
  private readonly logger = new Logger(AuthTokenRepository.name);

  constructor(
    @InjectRepository(AuthToken)
    private readonly repository: Repository<AuthToken>,
  ) {}

  /**
   * Create a new auth token
   */
  async createToken(data: {
    userId: string;
    tokenType: TokenType;
    tokenHash: string;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
  }): Promise<AuthToken> {
    try {
      this.logger.debug(`Creating ${data.tokenType} token for user: ${data.userId}`);

      const token = this.repository.create({
        userId: data.userId,
        tokenType: data.tokenType,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        metadata: data.metadata,
      });

      const savedToken = await this.repository.save(token);
      this.logger.debug(`Token created with ID: ${savedToken.id}`);

      return savedToken;
    } catch (error) {
      this.logger.error(`Error creating ${data.tokenType} token for user: ${data.userId}`, error);
      throw error;
    }
  }

  /**
   * Find a valid token by hash and type
   */
  async findValidToken(tokenHash: string, tokenType: TokenType): Promise<AuthToken | null> {
    try {
      this.logger.debug(`Finding valid ${tokenType} token`);

      const token = await this.repository.findOne({
        where: {
          tokenHash,
          tokenType,
          usedAt: IsNull(),
          revokedAt: IsNull(),
          expiresAt: LessThanOrEqual(new Date()),
        },
        relations: ['user'],
      });

      return token;
    } catch (error) {
      this.logger.error(`Error finding valid ${tokenType} token`, error);
      throw error;
    }
  }

  /**
   * Find all tokens for a user by type
   */
  async findUserTokensByType(userId: string, tokenType: TokenType): Promise<AuthToken[]> {
    try {
      this.logger.debug(`Finding ${tokenType} tokens for user: ${userId}`);

      const tokens = await this.repository.find({
        where: {
          userId,
          tokenType,
        },
        order: { createdAt: 'DESC' },
      });

      return tokens;
    } catch (error) {
      this.logger.error(`Error finding ${tokenType} tokens for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Mark token as used
   */
  async markTokenAsUsed(tokenId: string): Promise<void> {
    try {
      this.logger.debug(`Marking token as used: ${tokenId}`);

      await this.repository.update(tokenId, {
        usedAt: new Date(),
      });

      this.logger.debug(`Token marked as used: ${tokenId}`);
    } catch (error) {
      this.logger.error(`Error marking token as used: ${tokenId}`, error);
      throw error;
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string): Promise<void> {
    try {
      this.logger.debug(`Revoking token: ${tokenId}`);

      await this.repository.update(tokenId, {
        revokedAt: new Date(),
      });

      this.logger.debug(`Token revoked: ${tokenId}`);
    } catch (error) {
      this.logger.error(`Error revoking token: ${tokenId}`, error);
      throw error;
    }
  }

  /**
   * Revoke all tokens of a specific type for a user
   */
  async revokeUserTokensByType(userId: string, tokenType: TokenType): Promise<void> {
    try {
      this.logger.debug(`Revoking all ${tokenType} tokens for user: ${userId}`);

      await this.repository.update(
        {
          userId,
          tokenType,
          revokedAt: IsNull(),
        },
        {
          revokedAt: new Date(),
        },
      );

      this.logger.debug(`All ${tokenType} tokens revoked for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error revoking ${tokenType} tokens for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      this.logger.debug(`Revoking all tokens for user: ${userId}`);

      await this.repository.update(
        {
          userId,
          revokedAt: IsNull(),
        },
        {
          revokedAt: new Date(),
        },
      );

      this.logger.debug(`All tokens revoked for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error revoking all tokens for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      this.logger.debug('Cleaning up expired tokens');

      const result = await this.repository.delete({
        expiresAt: LessThanOrEqual(new Date()),
      });

      const deletedCount = result.affected ?? 0;
      this.logger.debug(`Cleaned up ${deletedCount} expired tokens`);

      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired tokens', error);
      throw error;
    }
  }

  /**
   * Clean up used and revoked tokens older than specified days
   */
  async cleanupOldTokens(olderThanDays: number = 30): Promise<number> {
    try {
      this.logger.debug(`Cleaning up tokens older than ${olderThanDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('(used_at IS NOT NULL OR revoked_at IS NOT NULL)')
        .andWhere('created_at < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected ?? 0;
      this.logger.debug(`Cleaned up ${deletedCount} old tokens`);

      return deletedCount;
    } catch (error) {
      this.logger.error(`Error cleaning up old tokens`, error);
      throw error;
    }
  }

  /**
   * Check if user has valid refresh token
   */
  async hasValidRefreshToken(userId: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking for valid refresh token for user: ${userId}`);

      const count = await this.repository.count({
        where: {
          userId,
          tokenType: TokenType.REFRESH,
          usedAt: IsNull(),
          revokedAt: IsNull(),
          expiresAt: LessThanOrEqual(new Date()),
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking refresh token for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get token usage statistics for a user
   */
  async getTokenStats(userId: string): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    usedTokens: number;
    revokedTokens: number;
  }> {
    try {
      this.logger.debug(`Getting token statistics for user: ${userId}`);

      const [totalTokens, activeTokens, expiredTokens, usedTokens, revokedTokens] =
        await Promise.all([
          this.repository.count({ where: { userId } }),
          this.repository.count({
            where: {
              userId,
              usedAt: IsNull(),
              revokedAt: IsNull(),
              expiresAt: LessThanOrEqual(new Date()),
            },
          }),
          this.repository.count({
            where: {
              userId,
              expiresAt: LessThanOrEqual(new Date()),
            },
          }),
          this.repository.count({
            where: {
              userId,
              usedAt: IsNull(),
            },
          }),
          this.repository.count({
            where: {
              userId,
              revokedAt: IsNull(),
            },
          }),
        ]);

      const stats = {
        totalTokens,
        activeTokens,
        expiredTokens,
        usedTokens,
        revokedTokens,
      };

      this.logger.debug(`Token stats for user ${userId}:`, stats);
      return stats;
    } catch (error) {
      this.logger.error(`Error getting token stats for user: ${userId}`, error);
      throw error;
    }
  }
}
