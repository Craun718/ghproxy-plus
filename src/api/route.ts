import { Hono } from 'hono';
import { downloadApi } from './download';
import { ghproxy as ghproxyApi } from './ghproxy';
import { ping as pingApi } from './ping';
import { repositoryApi } from './repository';

const apiRouter = new Hono();

apiRouter.get('/ping', pingApi);
apiRouter.get('/download/*', downloadApi);
apiRouter.on(['GET', 'HEAD'], '/ghproxy/*', ghproxyApi);
apiRouter.get('/repos/:owner/:repo/releases', repositoryApi);

export default apiRouter;
