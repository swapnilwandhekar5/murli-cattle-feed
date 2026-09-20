import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.murlicattlefeed.app",
  appName: "MURLI Cattle Feed",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
