import { GraphQLClient } from "./graph.js";
import { type ValidatorUrlResolver } from "./types.js";

const validatorCacheKey = "enabled_endpoints";

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class CachingValidatorResolver {
  private client: GraphQLClient;
  private cacheTTL: number;
  private cache: Map<string, CacheItem<string[]>> = new Map();

  constructor(client: GraphQLClient, ttlMs: number = 10 * 60 * 1000) {
    this.client = client;
    this.cacheTTL = ttlMs;
  }

  async resolve(): Promise<string | undefined> {
    let endpoints: string[] | undefined;

    const cached = this.cache.get(validatorCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      endpoints = cached.value;
    }

    if (!endpoints || endpoints.length === 0) {
      endpoints = await this.client.listEnabledValidatorEndpoints();
      if (!endpoints || endpoints.length === 0) {
        throw new Error("no enabled validator endpoints found");
      }
      this.cache.set(validatorCacheKey, {
        value: endpoints,
        expiresAt: Date.now() + this.cacheTTL,
      });
    }

    const randomIndex = Math.floor(Math.random() * endpoints.length);
    return endpoints[randomIndex];
  }

  getResolver(): ValidatorUrlResolver {
    return () => this.resolve();
  }
}

export function newCachingValidatorResolver(
  client: GraphQLClient,
  ttlMs: number = 10 * 60 * 1000,
): ValidatorUrlResolver {
  const resolver = new CachingValidatorResolver(client, ttlMs);
  return resolver.getResolver();
}
