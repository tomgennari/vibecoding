import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Materiales para el aula: paginas sueltas en public/<nombre>/index.html
  // ("El pez por dentro y por fuera" y "El tucán toco")
  async rewrites() {
    return [
      { source: "/pez", destination: "/pez/index.html" },
      { source: "/tucan", destination: "/tucan/index.html" },
    ];
  },
};

export default nextConfig;
