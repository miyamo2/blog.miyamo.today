/**
 * The contract between the `remote-image-staging` integration and
 * src/lib/staged-remote-image.ts.
 *
 * The integration runs while the astro config is evaluated; the code that
 * stages images runs while pages render. Those are separate module graphs, so
 * a module-level value cannot be shared between them -- process.env can, and
 * these accessors keep its keys in one place.
 */

export interface RemoteImageDirectories {
  /** build output root; a staged original has to land inside it */
  outDir: string;
  /** where downloaded originals are kept between builds */
  cacheDir: string;
  /**
   * Hashed-assets folder, relative to the output root. Originals are staged
   * there so the variants astro derives from them land next to every other
   * hashed asset -- the deploy step uploads `dist/_astro` first and as
   * `immutable` (see .github/workflows/publish.yaml), which is what they are.
   */
  assetsDir: string;
}

export const publishRemoteImageDirectories = (dirs: RemoteImageDirectories): void => {
  process.env.REMOTE_IMAGE_OUT_DIR = dirs.outDir;
  process.env.REMOTE_IMAGE_CACHE_DIR = dirs.cacheDir;
  process.env.REMOTE_IMAGE_ASSETS_DIR = dirs.assetsDir;
};

/** unset outside `astro build` -- nothing is staged then */
export const remoteImageOutDir = (): string | undefined =>
  process.env.REMOTE_IMAGE_OUT_DIR || undefined;

export const remoteImageCacheDir = (): string | undefined =>
  process.env.REMOTE_IMAGE_CACHE_DIR || undefined;

export const remoteImageAssetsDir = (): string => process.env.REMOTE_IMAGE_ASSETS_DIR || "_astro";
