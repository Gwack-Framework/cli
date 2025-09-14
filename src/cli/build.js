/**
 * Build Command
 *
 * Builds the application for production with optimizations
 */

import { build } from 'vite';
import chalk from 'chalk';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { rm, mkdir, cp, writeFile, stat } from 'fs/promises';
import { createViteConfig } from '../config/vite.js';

/**
 * Build command handler
 *
 * @param {Object} options - Build options
 * @param {string} options.output - Output directory
 * @param {boolean} options.analyze - Whether to analyze bundle
 */
export async function buildCommand(options) {
    const { output, analyze } = options;
    const cwd = process.cwd();

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const cliRoot = resolve(__dirname, '..');

    console.log(chalk.blue.bold('Building for production...\n'));

    try {
        // Target output structure similar to Nuxt's .output
        const baseOutDir = resolve(cwd, output || '.output');
        const clientOutDir = join(baseOutDir, 'public');
        const serverOutDir = join(baseOutDir, 'server');
        const vendorOutDir = join(baseOutDir, 'vendor');

        // Clean previous output
        await rm(baseOutDir, { recursive: true, force: true });
        await mkdir(clientOutDir, { recursive: true });

        const viteConfig = createViteConfig({
            root: cwd,
            mode: 'production',
            build: {
                outDir: clientOutDir,
                emptyOutDir: true,
                rollupOptions: {
                    output: {
                        manualChunks: {
                            vue: ['vue', 'vue-router']
                        }
                    }
                }
            }
        });

        await build(viteConfig);


        const projectServerDir = join(cwd, 'server');
        if (existsSync(projectServerDir)) {
            console.log(chalk.gray('→ Copying server/ → .output/server'));
            await mkdir(serverOutDir, { recursive: true });
            await cp(projectServerDir, serverOutDir, { recursive: true, force: true });
        } else {
            console.log(chalk.yellow('⚠ No server/ directory found. Skipping server copy.'));
        }

        const projectVendorDir = join(cwd, 'vendor');
        if (existsSync(projectVendorDir)) {
            console.log(chalk.gray('→ Copying vendor/ → .output/vendor (this may take a while)'));
            await mkdir(vendorOutDir, { recursive: true });
            await cp(projectVendorDir, vendorOutDir, { recursive: true, force: true });
        } else {
            console.log(chalk.yellow('⚠ No vendor/ directory found. Ensure dependencies are installed before deployment.'));
        }

        for (const f of ['composer.json', 'composer.lock']) {
            const src = join(cwd, f);
            if (existsSync(src)) {
                await cp(src, join(baseOutDir, f), { force: true });
            }
        }

        const prodShimPath = resolve(cliRoot, 'shims', 'prod-index.php');
        const fallbackShimPath = resolve(cliRoot, 'shims', 'index.php');
        const useShim = existsSync(prodShimPath) ? prodShimPath : fallbackShimPath;
        await cp(useShim, join(baseOutDir, 'index.php'));

        let sizes = [];
        try {
            const clientStat = await stat(clientOutDir);
            sizes.push(`public: ${clientStat.isDirectory() ? 'dir' : clientStat.size + 'B'}`);
        } catch { }

        console.log(chalk.green('Build completed successfully!'));
        console.log(chalk.gray(`   Output base: ${baseOutDir}`));
        console.log(chalk.gray(`   Client: ${clientOutDir}`));
        if (existsSync(serverOutDir)) console.log(chalk.gray(`   Server: ${serverOutDir}`));
        if (existsSync(vendorOutDir)) console.log(chalk.gray(`   Vendor: ${vendorOutDir}`));

        if (analyze) {
            console.log(chalk.blue('Bundle analysis would go here...'));
        }

    } catch (error) {
        console.error(chalk.red('Build failed:'));
        console.error(error.message);
        process.exit(1);
    }
}
