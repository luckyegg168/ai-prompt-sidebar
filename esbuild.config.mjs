import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

const commonOptions = {
  bundle: true,
  target: "chrome120",
  format: "iife",
  sourcemap: true,
  minify: !isWatch,
};

async function build() {
  // Content script
  const contentCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: [resolve(__dirname, "src/content/sidebar.ts")],
    outfile: resolve(__dirname, "dist/content.js"),
  });

  // Service worker
  const workerCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: [resolve(__dirname, "src/background/service-worker.ts")],
    outfile: resolve(__dirname, "dist/service-worker.js"),
  });

  // Popup
  const popupCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: [resolve(__dirname, "src/popup/popup.ts")],
    outfile: resolve(__dirname, "dist/popup.js"),
  });

  // Copy static assets
  const distDir = resolve(__dirname, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

  copyFileSync(
    resolve(__dirname, "manifest.json"),
    resolve(distDir, "manifest.json")
  );
  copyFileSync(
    resolve(__dirname, "src/content/sidebar.css"),
    resolve(distDir, "sidebar.css")
  );
  copyFileSync(
    resolve(__dirname, "src/popup/popup.html"),
    resolve(distDir, "popup.html")
  );
  copyFileSync(
    resolve(__dirname, "src/popup/popup.css"),
    resolve(distDir, "popup.css")
  );
  copyFileSync(
    resolve(__dirname, "templates/defaults.json"),
    resolve(distDir, "defaults.json")
  );

  // Copy icons
  const iconsDistDir = resolve(distDir, "icons");
  if (!existsSync(iconsDistDir)) mkdirSync(iconsDistDir, { recursive: true });
  if (existsSync(resolve(__dirname, "icons"))) {
    cpSync(resolve(__dirname, "icons"), iconsDistDir, { recursive: true });
  }

  if (isWatch) {
    console.log("👀 Watching for changes...");
    await Promise.all([
      contentCtx.watch(),
      workerCtx.watch(),
      popupCtx.watch(),
    ]);
  } else {
    await Promise.all([
      contentCtx.rebuild(),
      workerCtx.rebuild(),
      popupCtx.rebuild(),
    ]);
    await Promise.all([
      contentCtx.dispose(),
      workerCtx.dispose(),
      popupCtx.dispose(),
    ]);
    console.log("✅ Build complete → dist/");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
