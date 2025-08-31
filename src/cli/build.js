/**
 * Build Command
 *
 * Builds the application for production with optimizations
 */

import { build } from 'vite';
import chalk from 'chalk';
import { join } from 'path';
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

    console.log(chalk.blue.bold('Building for production...\n'));

    try {
        const viteConfig = createViteConfig({
            root: cwd,
            mode: 'production',
            build: {
                outDir: output,
                rollupOptions: {
                    output: {
                        manualChunks: {
                            vue: ['vue', 'vue-router'],
                            vendor: ['@gwack/framework']
                        }
                    }
                }
            }
        });

        await build(viteConfig);

        console.log(chalk.green('Build completed successfully!'));
        console.log(chalk.gray(`   Output: ${join(cwd, output)}`));

        if (analyze) {
            console.log(chalk.blue('Bundle analysis would go here...'));
        }

    } catch (error) {
        console.error(chalk.red('Build failed:'));
        console.error(error.message);
        process.exit(1);
    }
}
