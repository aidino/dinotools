import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/react-core", "@copilotkit/runtime-client-gql"],
};

export default nextConfig;
