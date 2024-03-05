/** @typedef {import('@sveltejs/kit').Handle} Handle */

/**
 * @param {{ [key: string]: string }} proxy
 * @param {{ debug?: boolean; changeOrigin?: boolean }=} options
 * @returns Handle
 */
export function proxyHandle(proxy, options = { changeOrigin: true }) {
  return async function ({ event, resolve }) {
    const { url, request } = event;
    const { pathname } = url;

    /**
     * Find first matching path
     */
    const matchingProxy = Object.keys(proxy).find((proxyPath) =>
      pathname.match(proxyPath),
    );
    if (matchingProxy) {
      const proxyTarget = proxy[matchingProxy];

      /**
       * Collect request headers
       */
      const requestHeaders = new Headers(request.headers);
      if (options && options.changeOrigin) {
        requestHeaders.delete('host');
      }

      if (options && options.debug) {
        console.debug(`Proxy: ${proxyTarget}${pathname}`, requestHeaders);
      }

      /**
       * Fetch data from remote server
       */
      try {
        const response = await fetch(`${proxyTarget}${pathname}`, {
          redirect: 'manual',
          method: request.method,
          headers: requestHeaders,
        });

        /**
         * Clean up response headers
         */
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('content-encoding');

        if (options && options.debug) {
          console.debug(
            `Proxy response (${response.status}) headers:`,
            responseHeaders,
          );
        }

        /**
         * Return response from remote server
         */
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        console.error(error);
      }
    }

    /**
     * Proceed without proxy
     */
    return await resolve(event);
  };
}
