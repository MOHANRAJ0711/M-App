import type { Request, Response } from "express";
import fs from "node:fs";
import { deleteRecording, getRecording, listRecordings } from "./recording.service";
import { routeParam } from "../utils/route-param";

export async function list(req: Request, res: Response) {
  const query = {
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    meetingId: typeof req.query.meetingId === "string" ? req.query.meetingId : undefined,
    from: typeof req.query.from === "string" ? req.query.from : undefined,
    to: typeof req.query.to === "string" ? req.query.to : undefined,
    sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
    cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
  };
  res.json(await listRecordings(req.user!.id, query));
}

export async function detail(req: Request, res: Response) {
  const result = await getRecording(req.user!.id, routeParam(req.params.id));
  res.json({ recording: result.recording });
}

export async function stream(req: Request, res: Response) {
  const result = await getRecording(req.user!.id, routeParam(req.params.id));
  const stat = await fs.promises.stat(result.absolutePath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Type": result.mimeType,
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(result.absolutePath).pipe(res);
    return;
  }

  const [startText, endText] = range.replace(/bytes=/, "").split("-");
  const start = Number(startText);
  const end = endText ? Number(endText) : stat.size - 1;
  if (!Number.isFinite(start) || start < 0 || start >= stat.size || end < start) {
    res.status(416).set("Content-Range", `bytes */${stat.size}`).end();
    return;
  }

  res.writeHead(206, {
    "Content-Type": result.mimeType,
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
  });
  fs.createReadStream(result.absolutePath, { start, end }).pipe(res);
}

export async function download(req: Request, res: Response) {
  const result = await getRecording(req.user!.id, routeParam(req.params.id));
  res.download(result.absolutePath, result.fileName);
}

export async function remove(req: Request, res: Response) {
  res.json(await deleteRecording(req.user!.id, routeParam(req.params.id)));
}
