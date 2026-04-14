/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@auth/prisma-adapter"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
