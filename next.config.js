process.env.TZ = "America/Sao_Paulo";

const nextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

module.exports = nextConfig;
