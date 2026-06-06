import { z, defineCollection } from "astro:content";

function removeDupsAndLowerCase(array: string[]) {
	if (!array.length) return array;
	const lowercaseItems = array.map((str) => str.toLowerCase());
	const distinctItems = new Set(lowercaseItems);
	return Array.from(distinctItems);
}

const post = defineCollection({
	type: "content",
	schema: ({ image }) =>
		z.object({
			title: z.string().max(60),
			description: z.string().min(50).max(160),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			coverImage: z
				.object({
					src: image(),
					alt: z.string(),
				})
				.optional(),
			draft: z.boolean().default(false),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			ogImage: z.string().optional(),
		}),
});

const draft = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string().max(60),
		description: z.string().min(50).max(160).optional(),
		publishDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
		tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
		draft: z.literal(true).default(true),
	}),
});

const lamaran = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string().max(100),
		description: z.string().min(30).max(200),
		publishDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
		tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
		draft: z.boolean().default(true),
	}),
});

export const collections = { post, draft, lamaran };
