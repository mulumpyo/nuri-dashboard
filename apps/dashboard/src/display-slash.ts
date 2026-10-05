type Head = { statusCode: number; setHeader: (name: string, value: string) => void; end: () => void };

export const displaySlashTo = (url = "") => {
  const [path, query] = url.split("?");
  if (path !== "/display") return null;
  return query ? `/display/?${query}` : "/display/";
};

export const displaySlash = () => {
  const redirect = (req: { url?: string }, res: Head, next: () => void) => {
    const to = displaySlashTo(req.url);
    if (!to) {
      next();
      return;
    }
    res.statusCode = 308;
    res.setHeader("Location", to);
    res.end();
  };

  return {
    name: "display-slash",
    configureServer(server: { middlewares: { use: (fn: typeof redirect) => void } }) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof redirect) => void } }) {
      server.middlewares.use(redirect);
    },
  };
};
