import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const sourceDir = "src/gallery/animated";
const webmDir = "public/media/gallery/animated-webm";
const mp4Dir = "public/media/gallery/animated-mp4";
const force = process.argv.includes("--force") || process.argv.includes("--overwrite");

mkdirSync(webmDir, { recursive: true });
mkdirSync(mp4Dir, { recursive: true });

const gifFiles = readdirSync(sourceDir)
  .filter((file) => file.toLowerCase().endsWith(".gif"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${result.status}`);
  }
}

for (const file of gifFiles) {
  const name = basename(file, extname(file));
  const input = join(sourceDir, file);
  const webmOutput = join(webmDir, `${name}.webm`);
  const mp4Output = join(mp4Dir, `${name}.mp4`);
  const evenScale = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

  if (!force && existsSync(webmOutput) && existsSync(mp4Output)) {
    console.log(`Skipping ${file}; variants already exist.`);
    continue;
  }

  const overwriteFlag = force ? "-y" : "-n";
  console.log(`Generating video variants for ${file}`);

  if (force || !existsSync(webmOutput)) {
    runFfmpeg([
      overwriteFlag,
      "-i",
      input,
      "-an",
      "-vf",
      evenScale,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      "34",
      "-pix_fmt",
      "yuv420p",
      "-fps_mode",
      "vfr",
      webmOutput,
    ]);
  }

  if (force || !existsSync(mp4Output)) {
    runFfmpeg([
      overwriteFlag,
      "-i",
      input,
      "-an",
      "-vf",
      evenScale,
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-fps_mode",
      "vfr",
      mp4Output,
    ]);
  }
}

console.log(`Generated variants for ${gifFiles.length} GIF file(s).`);
