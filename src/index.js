import { createClient } from '@supabase/supabase-js';
import { Router } from 'itty-router';
import { json, status, withContent } from 'itty-router-extras';
import { readFrom, writeTo } from './utils/cache';

const router = new Router();

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

router.get('/articles', async (request, {SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES}) => {
	const cachedArticles = await readFrom(ARTICLES, '/articles');
	if(cachedArticles) {
		// console.log('returning cached articles');
		return json(cachedArticles);
	}

	// console.log('returning fresh articles');
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	const { data } = await supabase.from('articles').select('*');
	await writeTo(ARTICLES, '/articles', data);
	return json(data);
});

router.get('/articles/:id', async (request, {SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES}) => {
	const { id } = request.params;
	const cachedArticle = await readFrom(ARTICLES, `/articles/${id}`);
	if(cachedArticle) {
		// console.log('returning cached article');
		return json(cachedArticle);
	}

	// console.log('returning fresh article');
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	const { data } = await supabase.from('articles').select('*').filter('id', 'eq', request.params.id);
	if(!data) {
		return status(404, "Not found")
	}
	await writeTo(ARTICLES, `/articles/${id}`, data);
	return json(data);
});

router.get('/write-kv', async(request, { ARTICLES }) => {
	const articles = [{title: 'Test 1'}, {title: 'Teeeeeest'}]

	await writeTo(ARTICLES, '/articles', articles);
	return json(articles);
})

router.get('/read-kv', async(request, { ARTICLES }) => {
	const articles = await readFrom(ARTICLES, '/articles');
	return json(articles);
})

router.post(
	'/revalidate', 
	withContent,
	async(request, {SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES}, context) => {
		const updateCache = async () => {
			const { type, record, old_record } = request.content;
			const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
			if(type === 'INSERT' || type === 'UPDATE') {
				await writeTo(ARTICLES, `/articles/${record.id}`, record);	
			}
	
			if(type === 'DELETE') {
				await ARTICLES.delete(`/articles/${old_record.id}`)
			}
				
			const { data: articles } = await supabase.from('articles').select('*');
			await writeTo(ARTICLES, '/articles', articles);
		}

		context.waitUntil(updateCache());

		return json({received: true});
	}
)

router.all('*', () => status(404, 'Not found'))	

export default {
	fetch: router.handle
};
