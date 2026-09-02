import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Next sends `X-Powered-By: Next.js` on every response by default. nginx already
  // hides its own version (`server_tokens off`, nginx/nginx.conf); leaving this one on
  // announces the framework anyway, so the two settings are turned off together.
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
