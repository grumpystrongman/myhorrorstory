const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 3100);
const adminPort = Number(process.env.PLAYWRIGHT_ADMIN_PORT ?? 3101);

export const WEB_BASE_URL = `http://127.0.0.1:${webPort}`;
export const ADMIN_BASE_URL = `http://127.0.0.1:${adminPort}`;
