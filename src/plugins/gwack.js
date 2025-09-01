/**
 * Gwack Framework Vite Plugin
 *
 * Handles:
 * - Routing for Vue pages
 * - Virtual module generation
 * - HMR integration
 * - PHP route discovery
 */

import { readdir, stat } from 'fs/promises';
import { join, relative, extname, basename } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

/**
 * Gwack Framework Vite plugin
 *
 * @param {Object} options - Plugin options
 * @returns {Object} Vite plugin
 */
export function gwackPlugin(options = {}) {
  const {
    pagesDir,
    serverDir,
    phpPort = 8000
  } = options;

  let config;

  return {
    name: 'gwack-framework',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    buildStart() {
      // Create .gwack directory if it doesn't exist
      const gwackDir = join(process.cwd(), '.gwack');
      if (!existsSync(gwackDir)) {
        mkdirSync(gwackDir, { recursive: true });
      }

      // Generate entry point file
      const entryContent = generateEntryPoint();
      const entryPath = join(gwackDir, 'entry.js');
      writeFileSync(entryPath, entryContent);

      // Watch pages directory for changes
      if (existsSync(pagesDir)) {
        this.addWatchFile(pagesDir);
      }
    },

    resolveId(id) {
      // Handle virtual modules
      if (id === 'virtual:gwack-routes') {
        return id;
      }
      if (id === 'virtual:gwack-app') {
        return id;
      }
    },

    async load(id) {
      // Generate routes from pages directory
      if (id === 'virtual:gwack-routes') {
        const routes = await generateRoutes(pagesDir);
        return `export default ${JSON.stringify(routes, null, 2)};`;
      }

      // Generate main app component
      if (id === 'virtual:gwack-app') {
        return generateAppComponent();
      }

      // Generate entry point
      if (id === 'virtual:gwack-entry') {
        return generateEntryPoint(phpPort);
      }
    },        // Handle HMR updates
    handleHotUpdate(ctx) {
      // Only regenerate routes if it's a new/deleted Vue file in pages
      // Don't interfere with regular Vue file content changes
      if (ctx.file.includes(pagesDir) && ctx.file.endsWith('.vue')) {
        // Check if this is a new file or file deletion by checking if the route exists
        // For content changes, let Vite handle the normal Vue HMR
        const fileName = ctx.file.split('/').pop();

        // Only invalidate routes module if it's likely a new/deleted file
        // This is a simple heuristic - in production you'd want more sophisticated detection
        if (ctx.type === 'create' || ctx.type === 'delete') {
          // Regenerate entry file with new routes
          const gwackDir = join(process.cwd(), '.gwack');
          const entryContent = generateEntryPoint();
          const entryPath = join(gwackDir, 'entry.js');
          writeFileSync(entryPath, entryContent);

          const routesModule = ctx.server.moduleGraph.getModuleById('virtual:gwack-routes');
          if (routesModule) {
            ctx.server.reloadModule(routesModule);
          }
        }

        // Let Vue handle normal file content updates
        return undefined;
      }
    }
  };
}

/**
 * Generate routes from pages directory
 *
 * @param {string} pagesDir - Pages directory path
 * @returns {Array} Route definitions
 */
async function generateRoutes(pagesDir) {
  const routes = [];

  if (!existsSync(pagesDir)) {
    return routes;
  }

  async function scanDirectory(dir, prefix = '') {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await scanDirectory(fullPath, join(prefix, entry));
      } else if (entry.endsWith('.vue')) {
        const routePath = generateRoutePath(prefix, entry);
        const componentPath = relative(pagesDir, fullPath);

        routes.push({
          path: routePath,
          name: routePath.replace(/\//g, '.').replace(/^\./, '') || 'index',
          component: `../pages/${componentPath}`
        });
      }
    }
  }

  await scanDirectory(pagesDir);

  return routes;
}

/**
 * Generate route path from file path
 *
 * @param {string} prefix - Directory prefix
 * @param {string} filename - Vue file name
 * @returns {string} Route path
 */
function generateRoutePath(prefix, filename) {
  const name = basename(filename, '.vue');

  // Handle index files
  if (name === 'index') {
    return prefix === '' ? '/' : `/${prefix}`;
  }

  // Handle dynamic routes [id].vue -> :id
  if (name.startsWith('[') && name.endsWith(']')) {
    const param = name.slice(1, -1);
    return prefix === '' ? `/:${param}` : `/${prefix}/:${param}`;
  }

  // Regular route
  return prefix === '' ? `/${name}` : `/${prefix}/${name}`;
}

/**
 * Generate main App component
 * Reads the template from shims/app-component.js
 *
 * @returns {string} Vue component code
 */
function generateAppComponent() {
  try {
    const shimPath = join(process.cwd(), 'node_modules/@gwack/cli/src/shims/app-component.js');
    if (existsSync(shimPath)) {
      return readFileSync(shimPath, 'utf8').replace(/^export default /, '').replace(/export default/, '');
    }
  } catch (error) {
    console.warn('Could not read app component shim, using fallback');
  }

  // Fallback to embedded template
  return `
export default {
  name: 'GwackApp',
  template: \`
    <router-view />
  \`,
  style: \`
    #app {
      min-height: 100vh;
    }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  \`
}
`;
}

/**
 * Generate the main entry point for the application
 * Reads the template from shims/entry-point.js
 *
 * @param {number} phpPort - PHP server port
 * @returns {string} Entry point code
 */
function generateEntryPoint(phpPort) {
  try {
    const shimPath = join(process.cwd(), 'node_modules/@gwack/cli/src/shims/entry-point.js');
    if (existsSync(shimPath)) {
      return readFileSync(shimPath, 'utf8');
    }
  } catch (error) {
    console.error('Could not read entry point shim');
    return '';
  }
}


