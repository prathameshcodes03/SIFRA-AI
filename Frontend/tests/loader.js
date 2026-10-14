/**
 * Node test loader that resolves the project's extensionless Vite-style
 * imports (e.g. `../mathematics/angles`) so pure app modules can be tested
 * directly with `node --test` without a bundler.
 *
 * Test-only: not part of the application bundle.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const EXTENSIONS = [".js", ".jsx", "/index.js", "/index.jsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error.code !== "ERR_MODULE_NOT_FOUND" ||
      !specifier.startsWith(".")
    ) {
      throw error;
    }

    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch {
        // Try the next candidate extension.
      }
    }
    throw error;
  }
}

register(pathToFileURL(import.meta.filename));