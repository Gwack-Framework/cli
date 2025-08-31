/**
 * PHP Server Management
 *
 * Handles starting and managing the PHP development server
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import chalk from 'chalk';

/**
 * Start PHP development server
 *
 * @param {string} port - Port to run PHP server on
 * @param {string} cwd - Current working directory
 * @returns {Promise<ChildProcess>} PHP server process
 */
export async function startPhpServer(port, cwd) {
    // Create the PHP entry point
    await createPhpEntryPoint(cwd);

    const phpArgs = [
        '-S', `localhost:${port}`,
        '-t', join(cwd, '.gwack'),
        'index.php'
    ];

    const phpProcess = spawn('php', phpArgs, {
        cwd: join(cwd, '.gwack'),
        stdio: ['ignore', 'pipe', 'pipe']
    });

    phpProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('Development Server')) {
            console.log(chalk.blue('[PHP]'), output);
        }
    });

    phpProcess.stderr.on('data', (data) => {
        const text = data.toString();
        if (!text) return;

        // PHP's built-in server writes request logs to STDERR; classify lines.
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        for (const line of lines) {
            if (isPhpWarning(line)) {
                console.warn(chalk.yellow('[PHP WARN]'), line);
                continue;
            }

            if (isPhpError(line)) {
                console.error(chalk.red('[PHP ERROR]'), line);
                continue;
            }

            if (isPhpRequestLog(line)) {
                console.log(chalk.blue('[PHP]'), line);
                continue;
            }

            // Fallback: treat as info to avoid noisy false-positive errors from STDERR
            console.log(chalk.blue('[PHP]'), line);
        }
    });

    phpProcess.on('error', (error) => {
        console.error(chalk.red('❌ Failed to start PHP server:'), error.message);
    });

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    return phpProcess;
}

// --- Helpers ---------------------------------------------------------------
function isPhpWarning(line) {
    // Common non-fatal messages from PHP
    return /PHP (Warning|Notice|Deprecated)/i.test(line);
}

function isPhpError(line) {
    // Fatal and parse errors, uncaught exceptions, etc.
    return /PHP (Fatal error|Parse error|Recoverable fatal error)|Uncaught (Exception|Error)|Stack trace:/i.test(line);
}

function isPhpRequestLog(line) {
    if (/Development Server/i.test(line)) return false;

    // Typical PHP built-in server access log formats written to STDERR, e.g.:
    // [Sun Aug 31 12:34:56 2025] 127.0.0.1:54432 [200]: GET /index.php
    // [Sun Aug 31 12:34:56 2025] ::1:54432 GET /
    // 127.0.0.1:54432 [404]: GET /favicon.ico
    const withTimeAndStatus = /^\[[^\]]+\]\s+\S+:\d+\s+\[\d{3}\]:\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i;
    const withTime = /^\[[^\]]+\]\s+\S+:\d+\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i;
    const noTime = /^\S+:\d+\s+\[\d{3}\]:\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i;
    return withTimeAndStatus.test(line) || withTime.test(line) || noTime.test(line);
}

/**
 * Create PHP entry point in .dist directory
 *
 * @param {string} cwd - Current working directory
 */
async function createPhpEntryPoint(cwd) {
    // Ensure .gwack directory exists
    await mkdir(join(cwd, '.gwack'), { recursive: true });
    const entryPoint = `<?php
        /**
         * Gwack Framework Entry Point
         *
         * This file bootstraps the framework and handles all incoming requests
         * It's automatically generated - do not edit manually
         */

        require_once '../vendor/autoload.php';

        use Gwack\\Core\\Application;
        use Gwack\\Core\\Routing\\FileBasedRouter;

        // Create the application
        $app = new Application(__DIR__ . '/..');

        // Configure for development
        $app->configure([
            'env' => 'development',
            'debug' => true,
            'api' => [
                'prefix' => '/api'
            ]
        ]);

        // Boot the framework
        $app->boot();

        // Set up file-based routing
        $fileRouter = new FileBasedRouter($app->getContainer());
        $fileRouter->discoverRoutes(__DIR__ . '/../server');

        // Optionally include compiled routes cache if present
        if (file_exists(__DIR__ . '/routes.php')) {
            // This returns an array mapping paths to closures, but our runtime router
            // builds from discovery; keeping here for future optimization.
        }

        // Handle the incoming request
        $app->run();
    `;

    await writeFile(join(cwd, '.gwack/index.php'), entryPoint);
}
