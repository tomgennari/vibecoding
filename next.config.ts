import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "El pez por dentro y por fuera": pagina suelta en public/pez/index.html
  async rewrites() {
    return [{ source: "/pez", destination: "/pez/index.html" }];
  },
};

export default nextConfig;
