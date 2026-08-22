# Cost Model & Hosting Boundaries

## Target Zero-Cost Infrastructure ($0/month)

| Service | Provider & Tier | Limit | Handling of Limits / Cold Starts |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | Vercel Hobby | 100 GB bandwidth, 1M edge requests/mo | Static build; instant global CDN. |
| **API Backend** | Render Free | 750 shared free compute hrs/mo | Sleeps after 15m idle. Frontend displays a non-blocking wake-up status indicator. |
| **Database** | Neon Serverless PostgreSQL | 0.5 GB storage, scale-to-zero | Auto-suspends on idle; API reconnects within 5s with backoff. |
| **AI Inference** | Google AI Studio | Free tier (~1,500 req/day) | Bounded max token budget per branch (300 tokens); prompt caching. |
| **Local Cache** | IndexedDB | Browser limit (~unlimited) | Zero-latency local operations; 100% offline resilience. |
