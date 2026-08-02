import { defineMiddleware } from "astro:middleware";

// Yamada UI is built on emotion, which renders its `<style data-emotion>` tags
// inline inside the astro-island (i.e. in <body>) during SSR/SSG. Those tags sit
// inside the React hydration root, but the client render emits `null` for them,
// so React strips them on hydration and the emotion-styled layout collapses
// ("初期表示で崩れる").
//
// Relocating the tags into <head> — outside the hydration root — keeps them
// applied on first paint AND stable across hydration (React never touches <head>).
// This middleware also runs while pages are prerendered, so the fix applies to the
// static build output, not just `astro dev`.
const EMOTION_STYLE = /<style[^>]*\bdata-emotion="[^"]*"[^>]*>[\s\S]*?<\/style>/g;

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) {
    return response;
  }

  const html = await response.text();
  const bodyStart = html.indexOf("<body");
  if (bodyStart === -1 || !html.includes("data-emotion=")) {
    return new Response(html, response);
  }

  // Pull the emotion <style> tags out of <body>, preserving their relative order.
  const moved: string[] = [];
  const stripped = html.replace(EMOTION_STYLE, (tag, offset: number) => {
    if (offset > bodyStart) {
      moved.push(tag);
      return "";
    }
    return tag;
  });
  if (moved.length === 0) {
    return new Response(html, response);
  }

  // Append after any existing <head> CSS so emotion keeps its usual precedence.
  const relocated = stripped.replace("</head>", `${moved.join("")}</head>`);
  return new Response(relocated, response);
});
