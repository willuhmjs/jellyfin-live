import { describe, it, expect } from 'vitest';
import { cleanName, normalizeShow } from '$lib/server/normalization';

describe('Normalization Tests', () => {
	it('cleanName removes special characters and lowercases', () => {
		expect(cleanName('The Office (US)')).toBe('theofficeus');
		expect(cleanName('Brooklyn Nine-Nine')).toBe('brooklynninenine');
		expect(cleanName('  Messy  Name  ')).toBe('messyname');
	});

	it('normalizeShow handles TVMaze structure', () => {
		const tvmazeShow = {
			id: 123,
			name: 'Test Show',
			summary: 'Summary',
			genres: ['Drama'],
			premiered: '2023-01-01',
			status: 'Running'
		};
		const result = normalizeShow(tvmazeShow, 'tvmaze');
		expect(result?.id).toBe(123);
		expect(result?.name).toBe('Test Show');
		expect(result?.isJellyfinFallback).toBe(false);
	});

	it('normalizeShow handles Jellyfin structure', () => {
		const jellyfinShow = {
			Id: 'abc-123',
			Name: 'Jellyfin Show',
			Overview: 'Overview',
			Genres: ['Comedy'],
			PremiereDate: '2023-01-01T00:00:00.0000000Z',
			Type: 'Series'
		};
		const result = normalizeShow(jellyfinShow, 'jellyfin');
		expect(result?.id).toBe('abc-123');
		expect(result?.name).toBe('Jellyfin Show');
		expect(result?.isJellyfinFallback).toBe(true);
		expect(result?.premiered).toBe('2023-01-01');
	});
});
