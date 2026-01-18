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
    const trimmedName = name.trim();
    // Try exact match first
    let img = await db.seriesImage.findUnique({
        where: { name: trimmedName }
    });

    // If not found, try case-insensitive match
    if (!img) {
        img = await db.seriesImage.findFirst({
            where: {
                name: {
                    equals: trimmedName,
                    mode: 'insensitive'
                }
            }
        });
    }

    return img ? img.imageUrl : null;
}

export async function saveSeriesImage(name, url) {
    const trimmedName = name.trim();
    await db.seriesImage.upsert({
        where: { name: trimmedName },
        update: { imageUrl: url },
        create: { name: trimmedName, imageUrl: url }
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
