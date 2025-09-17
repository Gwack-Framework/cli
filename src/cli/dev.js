/**
 * Development Server Command
 *
 * Starts the development environment with:
 * - PHP server for backend API
 * - Vite dev server for frontend
 * - File watchers for HMR
 * - WebSocket bridge for full-stack HMR
 */

import { createServer } from 'vite';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync } from 'fs';
import { createViteConfig } from '../config/vite.js';
import { startPhpServer } from '../servers/php.js';

/**
 * Load configuration from gwack.config.js/ts
 * @param {string} cwd - Current working directory
 * @returns {Object} Configuration object
 */
async function loadConfig(cwd) {
    const configPaths = [
        join(cwd, 'gwack.config.js'),
        join(cwd, 'gwack.config.ts'),
        join(cwd, 'gwack.config.mjs')
    ];

    for (const configPath of configPaths) {
        if (existsSync(configPath)) {
            try {
                const config = await import(`file://${configPath}`);
                return config.default || config;
            } catch (error) {
                console.warn(chalk.yellow(`Warning: Failed to load config from ${configPath}`));
                console.warn(error.message);
            }
        }
    }

    return {};
}

/**
 * Development command handler
 *
 * @param {Object} options - Command options
 * @param {string} options.port - Frontend port
 * @param {string} options.phpPort - PHP server port
 * @param {string} options.host - Host to bind to
 */
export async function devCommand(options) {
    const { port, phpPort, host } = options;
    const cwd = process.cwd();

    console.log(chalk.blue.bold('Starting Gwack Framework Development Server\n'));

    try {
        // Start WebSocket server for HMR communication
        const wss = new WebSocketServer({ port: 8081 });
        console.log(chalk.green('✓ WebSocket server started on port 8081'));

        // Load configurations
        const gwackConfig = await loadConfig(cwd);
        const serveCfg = gwackConfig.serve || {};
        const phpCfg = serveCfg.php || {};
        const feCfg = serveCfg.frontend || {};

        // Start PHP server
        const resolvedPhpPort = phpCfg.port || parseInt(phpPort) || 8080;
        const phpProcess = await startPhpServer(resolvedPhpPort, cwd);
        console.log(chalk.green(`✓ PHP server started on port ${resolvedPhpPort}`));

        // Create Vite dev server
        const resolvedHost = feCfg.host || host || 'localhost';
        const resolvedPort = feCfg.port || parseInt(port) || 3000;
        const viteConfig = createViteConfig({
            root: cwd,
            phpPort: resolvedPhpPort,
            host: resolvedHost,
            port: resolvedPort,
            vite: gwackConfig.vite || {},
            runtimeGwack: gwackConfig.gwack || {}
        });

        const viteServer = await createServer(viteConfig);
        await viteServer.listen(resolvedPort, resolvedHost);

        console.log(chalk.green(`✓ Vite dev server started on http://${resolvedHost}:${resolvedPort}`));

        // Set up file watchers
        setupFileWatchers(cwd, wss);

        console.log(chalk.blue('\n🎉 Development server ready!'));
        console.log(chalk.gray(`   Frontend: http://${resolvedHost}:${resolvedPort}`));
        console.log(chalk.gray(`   Backend:  http://${resolvedHost}:${resolvedPhpPort}`));
        console.log(chalk.gray(`   Press Ctrl+C to stop\n`));

        // Handle cleanup on exit
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\nShutting down development server...'));
            phpProcess.kill();
            viteServer.close();
            wss.close();
            process.exit(0);
        });

    } catch (error) {
        console.error(chalk.red('Failed to start development server:'));
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Set up file watchers for HMR
 *
 * @param {string} cwd - Current working directory
 * @param {WebSocketServer} wss - WebSocket server for notifications
 */
function setupFileWatchers(cwd, wss) {
    // Watch PHP files in server/
    const phpWatcher = chokidar.watch(join(cwd, 'server/**/*.php'), {
        ignoreInitial: true
    });

    phpWatcher.on('change', (path) => {
        console.log(chalk.yellow(`PHP file changed: ${path}`));

        // Notify all connected clients
        wss.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(JSON.stringify({
                    type: 'php-reload',
                    path: path
                }));
            }
        });
    });

    // Watch for new PHP files
    phpWatcher.on('add', (path) => {
        console.log(chalk.green(`📁 New PHP route: ${path}`));

        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({
                    type: 'route-added',
                    path: path
                }));
            }
        });
    });

    console.log(chalk.green('✓ File watchers started'));
}