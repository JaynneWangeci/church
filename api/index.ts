import app from "../server/index.js";

export default async function handler(req: any, res: any) {
  return new Promise<void>((resolve) => {
    app(req, res, () => {
      res.status(404).json({ error: "Not found" });
      resolve();
    });
  });
}
