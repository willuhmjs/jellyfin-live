// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { JellyfinUser } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				user: Partial<JellyfinUser> & { Id: string };
				token: string;
                server?: string;
			} | undefined;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
