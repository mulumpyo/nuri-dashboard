type Incoming = { headers: Record<string, string | string[] | undefined> };
type ProxyReq = { setHeader: (name: string, value: string) => void };
type ProxyRes = {
  headersSent?: boolean;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body: string) => void;
};
type ProxyServer = {
  on(event: "proxyReq", listener: (proxyReq: ProxyReq, req: Incoming) => void): void;
  on(event: "error", listener: (err: Error, req: Incoming, res: ProxyRes | object) => void): void;
};

export const publicDevServer = {
  host: true,
  allowedHosts: true as const,
  hmr: process.env.VITE_PUBLIC_HOST
    ? { host: process.env.VITE_PUBLIC_HOST, protocol: "wss" as const, clientPort: 443 }
    : true,
};

export const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:3000",
    changeOrigin: true,
    timeout: 0,
    configure: (proxy: ProxyServer) => {
      proxy.on("proxyReq", (proxyReq, req) => {
        const host = req.headers.host;
        if (host) proxyReq.setHeader("x-forwarded-host", String(host));
        const proto = String(req.headers["x-forwarded-proto"] ?? "http").split(",")[0];
        proxyReq.setHeader("x-forwarded-proto", proto);
      });
      proxy.on("error", (_err, _req, res) => {
        if ("writeHead" in res && typeof (res as ProxyRes).writeHead === "function" && !(res as ProxyRes).headersSent) {
          const out = res as ProxyRes;
          out.writeHead(503, { "Content-Type": "application/json" });
          out.end(
            JSON.stringify({
              code: "API_DOWN",
              message: "API가 아직 기동 중입니다. 터미널에 Nest started가 나온 뒤 다시 시도하세요.",
            }),
          );
        }
      });
    },
  },
};
