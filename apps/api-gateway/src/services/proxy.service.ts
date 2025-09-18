import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';

import { ServiceInfo } from '@lib/common';

import { ServiceRegistryService } from './service-registry.service';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly serviceRegistry: ServiceRegistryService) {}

  async proxyRequest(req: Request, res: Response): Promise<void> {
    const { originalUrl, method: reqMethod } = req;
    const method = reqMethod;

    this.logger.debug(`Proxying ${method} ${originalUrl}`);

    try {
      // Discover the target service
      const service = await this.serviceRegistry.discoverByRoute(originalUrl);
      if (!service) {
        res.status(404).json({
          statusCode: 404,
          message: 'Service not found',
          error: 'Not Found',
        });
        return;
      }

      // Get route mapping to transform the URL if needed
      const mapping = this.serviceRegistry.getRouteMapping(originalUrl);
      const targetUrl = mapping
        ? this.serviceRegistry.transformRoute(originalUrl, mapping)
        : originalUrl;

      // Build the full target URL
      const fullTargetUrl = `http://${service.host}:${service.port}${targetUrl}`;
      this.logger.debug(`Forwarding to: ${fullTargetUrl}`);

      // Forward the request
      const response = await axios({
        method,
        url: fullTargetUrl,
        data: req.body as unknown,
        headers: this.sanitizeHeaders(req.headers),
        params: req.query,
        timeout: 30000, // 30 seconds timeout
        validateStatus: () => true, // Don't throw on HTTP error codes
      });

      // Forward response headers (except hop-by-hop headers)
      this.forwardResponseHeaders(response, res);

      // Set status and send response
      res.status(response.status).send(response.data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string })?.code;

      this.logger.error(`Proxy error for ${method} ${originalUrl}:`, errorMessage);

      if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
        res.status(503).json({
          statusCode: 503,
          message: 'Service unavailable',
          error: 'Service Unavailable',
        });
      } else if (errorCode === 'ECONNABORTED') {
        res.status(504).json({
          statusCode: 504,
          message: 'Gateway timeout',
          error: 'Gateway Timeout',
        });
      } else {
        res.status(502).json({
          statusCode: 502,
          message: 'Bad gateway',
          error: 'Bad Gateway',
        });
      }
    }
  }

  private sanitizeHeaders(headers: Record<string, string | string[]>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    // List of headers to exclude (hop-by-hop headers)
    const excludeHeaders = [
      'host',
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
      'content-length', // Will be set automatically by axios
    ];

    Object.keys(headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (!excludeHeaders.includes(lowerKey)) {
        const value = headers[key];
        sanitized[key] = Array.isArray(value) ? value[0] : value;
      }
    });

    return sanitized;
  }

  private forwardResponseHeaders(response: AxiosResponse, res: Response): void {
    // Headers to exclude from forwarding
    const excludeHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
    ];

    if (response.headers) {
      Object.keys(response.headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!excludeHeaders.includes(lowerKey)) {
          res.set(key, response.headers[key] as unknown as string);
        }
      });
    }
  }

  async healthCheckService(serviceName: string): Promise<boolean> {
    return this.serviceRegistry.healthCheck(serviceName);
  }

  async getServiceInfo(serviceName: string): Promise<ServiceInfo | null> {
    return this.serviceRegistry.discover(serviceName);
  }

  async getAllServices(): Promise<ServiceInfo[]> {
    return this.serviceRegistry.getAllServices();
  }
}
