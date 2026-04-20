import { Redis } from "@upstash/redis";

// 런타임에만 초기화 (빌드 시 환경변수 없어도 오류 안 남)
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !url.startsWith("https")) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return (await getRedis()?.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttl = 900
): Promise<void> {
  try {
    await getRedis()?.set(key, value, { ex: ttl });
  } catch {
    // Redis 장애 시 조용히 무시
  }
}

// 키의 남은 TTL(초) 반환. 키 없음 → -2, 만료 없음 → -1
export async function getTTLCached(key: string): Promise<number> {
  try {
    return (await getRedis()?.ttl(key)) ?? -2;
  } catch {
    return -2;
  }
}

// 여러 키를 한 번에 조회 (mget — 1 command)
export async function mgetCached<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  try {
    const redis = getRedis();
    if (!redis) return keys.map(() => null);
    return await redis.mget<T[]>(...keys);
  } catch {
    return keys.map(() => null);
  }
}
