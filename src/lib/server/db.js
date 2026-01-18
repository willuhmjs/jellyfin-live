import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from '$env/dynamic/private';

const globalForPrisma = global;

const connectionString = env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

/** @type {import('@prisma/client').PrismaClient} */
export const db = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = db;
}

export async function getSetting(key) {
    const setting = await db.setting.findUnique({
        where: { key }
    });
    return setting ? setting.value : null;
}

export async function setSetting(key, value) {
    await db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
    });
}

export async function getSeriesImage(name) {
    console.log(`[DB] getSeriesImage called for: ${name}`);
    const img = await db.seriesImage.findUnique({
        where: { name }
    });
    const result = img ? img.imageUrl : null;
    console.log(`[DB] getSeriesImage result for ${name}: ${result}`);
    return result;
}

export async function saveSeriesImage(name, url) {
    console.log(`[DB] saveSeriesImage called for: ${name}, url: ${url}`);
    await db.seriesImage.upsert({
        where: { name },
        update: { imageUrl: url },
        create: { name, imageUrl: url }
    });
}

export async function getTvMazeCache(endpoint) {
    const cache = await db.tvMazeCache.findUnique({
        where: { endpoint }
    });
    
    if (!cache) return null;

    return {
        data: cache.data,
        updated_at: cache.updatedAt.getTime()
    };
}

export async function setTvMazeCache(endpoint, data, timestamp) {
    await db.tvMazeCache.upsert({
        where: { endpoint },
        update: {
            data: data,
            updatedAt: new Date(timestamp)
        },
        create: {
            endpoint,
            data: data,
            updatedAt: new Date(timestamp)
        }
    });
}
