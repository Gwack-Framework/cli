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
import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { createViteConfig } from '../config/vite.js';
import { startPhpServer } from '../servers/php.js';

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

        // Start PHP server
        const phpProcess = await startPhpServer(phpPort, cwd);
        console.log(chalk.green(`✓ PHP server started on port ${phpPort}`));

        // Create Vite dev server
        const viteConfig = createViteConfig({
            root: cwd,
            phpPort,
            host,
            port: parseInt(port)
        });

        const viteServer = await createServer(viteConfig);
        await viteServer.listen(port, host);

        console.log(chalk.green(`✓ Vite dev server started on http://${host}:${port}`));

        // Set up file watchers
        setupFileWatchers(cwd, wss);

        console.log(chalk.blue('\n🎉 Development server ready!'));
        console.log(chalk.gray(`   Frontend: http://${host}:${port}`));
        console.log(chalk.gray(`   Backend:  http://${host}:${phpPort}`));
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