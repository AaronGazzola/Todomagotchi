const nextConfig = {
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
