/**
 * neals-passage.netlify.app  ->  nealgill.com/passage
 *
 * The canonical address is nealgill.com/passage, which reverse-proxies this
 * site. That proxy fetches from here, so a blanket redirect would bounce
 * every request straight back at itself. The Cloudflare function sets
 * x-via-nealgill on its own fetches; anything without it arrived at the
 * .netlify.app hostname directly and gets sent to the real address.
 *
 * Only GET page loads are redirected. Assets, POSTs (the password gate posts
 * a form) and /.netlify/ calls pass through untouched. 302 rather than 301,
 * so undoing this later does not mean waiting out cached permanent redirects.
 */
const CANONICAL = 'https://nealgill.com/passage';

export default async (request) => {
  if (request.method !== 'GET') return;
  if (request.headers.get('x-via-nealgill')) return;
  if (!(request.headers.get('accept') || '').includes('text/html')) return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/.netlify/')) return;

  return Response.redirect(CANONICAL + url.pathname + url.search, 302);
};

export const config = { path: '/*' };
