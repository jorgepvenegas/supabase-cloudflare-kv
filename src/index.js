import { createClient } from "@supabase/supabase-js";
import { Router } from "itty-router";
import { json, status, withContent } from "itty-router-extras";
import { readFrom, writeTo } from "./utils/cache";

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


router.get(
  "/weather",
  async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, WEATHER }) => {
    const cachedArticles = await readFrom(WEATHER, "/weather");
    if (cachedArticles) {
      console.log('Returning cached articles');
      return json(cachedArticles);
    }

    console.log('Returning fresh articles');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase.from("weather").select("*");
    return json(data);
  }
);

router.get('/set-weather',  async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, WEATHER }, context) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await supabase.from("weather").select("*");
  await writeTo(WEATHER, `/weather`, data)
  return json({ cache_updated: true });
});
    
router.post("/weather",withContent, async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, WEATHER }, context) => {
  const updateCache = async () => {
    const { type, record, old_record } = request.content;
    console.log("type", type);
    console.log("record", record);
    console.log("old_record", old_record)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data  } = await supabase.from("weather").select("*");
    await writeTo(WEATHER, "/weather", data);
  };

  context.waitUntil(updateCache());
  
  return json({ received: true });
});
  
// router.get(
//   "/articles",
//   async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }) => {
//     // console.log({SUPABASE_ANON_KEY, SUPABASE_URL});
//     const cachedArticles = await readFrom(ARTICLES, "/articles");
//     if (cachedArticles) {
//       // console.log('returning cached articles');
//       return json(cachedArticles);
//     }

//     // console.log('returning fresh articles');
//     const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//     const { data } = await supabase.from("articles").select("*");
//     await writeTo(ARTICLES, "/articles", data);
//     return json(data);
//   }
// );

// router.get(
  //   "/articles/:id",
  //   async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }) => {
    //     const { id } = request.params;
    //     const cachedArticle = await readFrom(ARTICLES, `/articles/${id}`);
    //     if (cachedArticle) {
      //       // console.log('returning cached article');
//       return json(cachedArticle);
//     }

//     // console.log('returning fresh article');
//     const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//     const { data } = await supabase
//       .from("articles")
//       .select("*")
//       .filter("id", "eq", request.params.id);
//     if (!data) {
//       return status(404, "Not found");
//     }
//     await writeTo(ARTICLES, `/articles/${id}`, data);
//     return json(data);
//   }
//   );

// router.post('/article', withContent, async(request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }, context) => {
//   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//   const { title, content } = request.content;

//   const { data, error } = await supabase.from("articles").insert({
//     title,
//     content,
//   });

//   if(error) {
//     return status(500, "Oh snap.");
//   }

//   return json(data)
// })


// router.post(
//   "/revalidate",
//   withContent,
//   async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }, context) => {
//     const updateCache = async () => {
//       const { type, record, old_record } = request.content;
//       const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//       if (type === "INSERT" || type === "UPDATE") {
//         await writeTo(ARTICLES, `/articles/${record.id}`, record);
//       }

//       if (type === "DELETE") {
//         await ARTICLES.delete(`/articles/${old_record.id}`);
//       }

//       const { data: articles } = await supabase.from("articles").select("*");
//       await writeTo(ARTICLES, "/articles", articles);
//     };

//     context.waitUntil(updateCache());

//     return json({ received: true });
//   }
// );


router.all("*", () => status(404, "Not found"));

export default {
  fetch: router.handle,
  // async scheduled(args) {
    // const weather = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-33.4691&longitude=-70.6420&current_weather=true')
    // const { current_weather } = await weather.json();
  //   console.log(args)
  //   console.log(current_weather);
  // }
};
