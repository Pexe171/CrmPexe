import fs from "node:fs";
import path from "node:path";

const webRoot = process.cwd();
const appDir = path.join(webRoot, "app");
const scanDirs = [path.join(webRoot, "app"), path.join(webRoot, "components")];

const SOURCE_ROUTE_PATTERNS = [
  /href\s*[:=]\s*["'](\/[^"']+)["']/g,
  /redirect\(\s*["'](\/[^"']+)["']/g,
  /(?:push|replace)\(\s*["'](\/[^"']+)["']/g
];

function walk(dir, extensions) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...walk(fullPath, extensions));
      continue;
    }

    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      output.push(fullPath);
    }
  }
  return output;
}

function toRouteFromPage(pageFile) {
  const relative = path.relative(appDir, pageFile).replace(/\\/g, "/");
  const directory = path.posix.dirname(relative);
  return directory === "." ? "/" : `/${directory}`;
}

function hasDynamicMatch(pathname, routes) {
  const targetParts = pathname.split("/").filter(Boolean);
  for (const route of routes) {
    const routeParts = route.split("/").filter(Boolean);
    if (routeParts.length !== targetParts.length) {
      continue;
    }

    const matches = routeParts.every((part, index) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        return true;
      }
      return part === targetParts[index];
    });

    if (matches) {
      return true;
    }
  }

  return false;
}

const pageFiles = walk(appDir, [".tsx"]).filter(
  (file) => path.basename(file) === "page.tsx" && !file.includes(`${path.sep}api${path.sep}`)
);
const existingRoutes = new Set(pageFiles.map(toRouteFromPage));

const sourceFiles = scanDirs.flatMap((dir) => walk(dir, [".ts", ".tsx"]));
const references = [];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(webRoot, file).replace(/\\/g, "/");

  for (const pattern of SOURCE_ROUTE_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      const route = match[1];
      if (route.startsWith("/api") || route.includes("/whatsapp/")) {
        continue;
      }
      references.push({ file: relativeFile, route });
    }
  }
}

const uniqueReferences = [...new Set(references.map((entry) => entry.route))].sort();
const brokenRoutes = uniqueReferences.filter(
  (route) => !existingRoutes.has(route) && !hasDynamicMatch(route, existingRoutes)
);

console.log("\n=== Rotas existentes (app/**/page.tsx) ===");
for (const route of [...existingRoutes].sort()) {
  console.log(`- ${route}`);
}

console.log("\n=== Rotas referenciadas (href/push/replace/redirect) ===");
for (const route of uniqueReferences) {
  console.log(`- ${route}`);
}

if (brokenRoutes.length > 0) {
  console.error("\n=== Rotas quebradas detectadas ===");
  for (const route of brokenRoutes) {
    const sources = references
      .filter((entry) => entry.route === route)
      .map((entry) => entry.file);
    console.error(`- ${route} (${[...new Set(sources)].join(", ")})`);
  }
  process.exit(1);
}

console.log("\n✅ Nenhuma rota quebrada encontrada nas referências internas.");
