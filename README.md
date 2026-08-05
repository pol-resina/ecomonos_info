# ecomonos-watcher

Te manda un email a **polresinamartinez@gmail.com** cuando
[Los Ecomonos](https://www.youtube.com/@ecomonos) publica un vídeo nuevo.

Lee el feed RSS público del canal, así que **no hace falta API key de YouTube ni cuota**.
Un cron de GitHub Actions lo comprueba cada 30 minutos y envía el correo por Gmail.

Todo el código está en un único archivo: [`src/index.ts`](src/index.ts), 79 líneas.

## Puesta en marcha

**1. Sube el repo a GitHub**

```bash
git remote add origin git@github.com:<tu-usuario>/ecomonos_info.git
git push -u origin main
```

**2. Crea una contraseña de aplicación de Gmail**

La contraseña normal de la cuenta no funciona por SMTP.

1. Activa la verificación en 2 pasos: <https://myaccount.google.com/signinoptions/twosv>
2. Genera la contraseña en <https://myaccount.google.com/apppasswords> → 16 caracteres.

Puedes enviarte el correo a ti mismo desde tu propio Gmail; llega a la bandeja de entrada.

**3. Añade los secrets del repo**

En *Settings → Secrets and variables → Actions*:

| Secret | Valor |
| --- | --- |
| `GMAIL_USER` | El Gmail desde el que se envía |
| `GMAIL_APP_PASSWORD` | La contraseña de aplicación de 16 caracteres |

**4. Lánzalo**

*Actions → Watch Ecomonos → Run workflow*.

La primera ejecución **no envía nada**: solo apunta cuál es el último vídeo actual como punto de
partida. Si no, recibirías 15 correos de golpe. A partir de ahí, cada vídeo nuevo te llega por email.

## Cómo sabe que un vídeo es nuevo

`state/last-seen.json` guarda una sola cosa, la fecha del último vídeo visto:

```json
{ "lastPublished": "2026-08-05T18:00:23+00:00" }
```

Es nuevo todo lo que se haya publicado después de esa fecha. El workflow hace commit del archivo
cuando cambia. Comparar fechas en vez de IDs tiene una ventaja: si Los Ecomonos editan el título de
un vídeo viejo, YouTube lo vuelve a sacar en el feed, pero su fecha sigue siendo antigua y no genera
un aviso falso.

Si un envío falla a mitad de una tanda, solo se guarda hasta el último enviado con éxito: el resto
se reintenta en la siguiente ejecución, sin duplicados.

## Probarlo en local

```bash
npm install
export GMAIL_USER='tu@gmail.com'
export GMAIL_APP_PASSWORD='abcd efgh ijkl mnop'
export STATE_PATH=/tmp/ecomonos.json   # para no tocar el estado real del repo

npm run build
node dist/index.js   # primera vez: solo guarda el punto de partida, no envía
```

Para que te llegue un email de verdad y comprobar que todo funciona, retrasa la fecha guardada
y vuelve a ejecutarlo:

```bash
echo '{"lastPublished":"2026-07-25T00:00:00+00:00"}' > /tmp/ecomonos.json
node dist/index.js
```

## Variables

Solo las dos primeras son obligatorias; el resto tiene valores por defecto.

| Variable | Por defecto |
| --- | --- |
| `GMAIL_USER` | — |
| `GMAIL_APP_PASSWORD` | — |
| `MAIL_TO` | `polresinamartinez@gmail.com` |
| `YOUTUBE_CHANNEL_ID` | `UCyYkUq0qMNP-ea7LEvspkug` (Los Ecomonos) |
| `STATE_PATH` | `state/last-seen.json` |

## A tener en cuenta

- El aviso tarda hasta ~30 min, más el retraso propio de GitHub. Su cron es best-effort: llega tarde
  a menudo y muy de vez en cuando se salta una ejecución.
- **GitHub desactiva los workflows programados tras 60 días sin actividad en el repo.** Avisa por
  email antes; cualquier commit (o darle a "Run workflow") lo reactiva.
- Los Shorts y los estrenos salen en el feed como vídeos normales. En un estreno, la fecha es la de
  anuncio, así que el aviso te llega al programarse, no al emitirse.
