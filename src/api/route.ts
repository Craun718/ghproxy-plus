import { Hono } from 'hono';
import { ghproxy as ghproxyApi } from './ghproxy';
import { ping as pingApi } from './ping';

const apiRouter = new Hono();

apiRouter.get('/ping', pingApi);
apiRouter.on(['GET', 'HEAD'], '/ghproxy/*', ghproxyApi);

export default apiRouter;
