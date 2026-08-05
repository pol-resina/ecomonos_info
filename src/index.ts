import { readFile, writeFile } from "node:fs/promises";
import nodemailer from "nodemailer";

const CHANNEL = process.env.YOUTUBE_CHANNEL_ID || "UCyYkUq0qMNP-ea7LEvspkug";
const MAIL_TO = process.env.MAIL_TO || "polresinamartinez@gmail.com";
const STATE = process.env.STATE_PATH || "state/last-seen.json";
const USER = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

/** El feed lo genera una máquina y siempre tiene la misma forma, así que basta con un regex. */
function parseFeed(xml: string) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, entry = ""]) => ({
      id: entry.match(/<yt:videoId>(.*?)</)?.[1] ?? "",
      published: entry.match(/<published>(.*?)</)?.[1] ?? "",
      title: (entry.match(/<title>([\s\S]*?)</)?.[1] ?? "").replace(
        /&(amp|lt|gt|quot|#39);/g,
        (_, e: string) => ENTITIES[e]!,
      ),
    }))
    .filter((v) => v.id && v.published)
    .sort((a, b) => a.published.localeCompare(b.published)); // el más antiguo primero
}

async function main() {
  if (!USER || !PASS) throw new Error("Falta GMAIL_USER o GMAIL_APP_PASSWORD (ver README).");

  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`);
  if (!res.ok) throw new Error(`El feed respondió ${res.status}`);

  const videos = parseFeed(await res.text());
  if (videos.length === 0) throw new Error("El feed no devolvió ningún vídeo.");

  const save = (published: string) => writeFile(STATE, JSON.stringify({ lastPublished: published }));
  const lastSeen: string | null = await readFile(STATE, "utf8")
    .then((raw) => JSON.parse(raw).lastPublished)
    .catch(() => null);

  // Primera ejecución: solo apuntamos por dónde vamos, o llegarían 15 correos de golpe.
  if (!lastSeen) {
    const ultimo = videos.at(-1)!;
    await save(ultimo.published);
    console.log(`Primera ejecución: punto de partida "${ultimo.title}". Sin emails.`);
    return;
  }

  // Por fecha y no por id: si editan un vídeo viejo YouTube lo reordena en el feed,
  // pero su fecha de publicación no cambia y así no genera un aviso falso.
  const nuevos = videos.filter((v) => v.published > lastSeen);
  if (nuevos.length === 0) {
    console.log("Sin vídeos nuevos.");
    return;
  }

  const mail = nodemailer.createTransport({ service: "gmail", auth: { user: USER, pass: PASS } });
  try {
    for (const v of nuevos) {
      const url = `https://www.youtube.com/watch?v=${v.id}`;
      await mail.sendMail({
        from: `Ecomonos <${USER}>`,
        to: MAIL_TO,
        subject: `🐒 Nuevo vídeo de Los Ecomonos: ${v.title}`,
        text: `${v.title}\n\n${url}`,
      });
      // Guardamos tras cada envío: si uno falla, los que queden se reintentan en la próxima vuelta.
      await save(v.published);
      console.log(`Enviado: ${v.title}`);
    }
  } finally {
    mail.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
