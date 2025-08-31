import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join, resolve } from 'path';
import { gwackPlugin } from '../plugins/gwack.js';

/**
 * Create Vite configuration
 *
 * @param {Object} options - Configuration options
 * @returns {Object} Vite configuration
 */
export function createViteConfig(options = {}) {
    const {
        root = process.cwd(),
        phpPort = 8000,
        host = 'localhost',
        port = 3000,
        mode = 'development'
    } = options;

    return defineConfig({
        root,
        mode,

        // Plugin configuration
        plugins: [
            vue({
                script: {
                    defineModel: true,
                    propsDestructure: true
                }
            }),
            gwackPlugin({
                phpPort,
                pagesDir: join(root, 'pages'),
                serverDir: join(root, 'server')
            })
        ],

        // Development server configuration
        server: {
            host,
            port,
            strictPort: true,

            // Proxy API calls to PHP server
            proxy: {
                '/api': {
                    target: `http://localhost:${phpPort}`,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api/, '')
                }
            },

            // CORS configuration
            cors: true
        },

        // Build configuration
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            target: 'es2020',

            rollupOptions: {
                input: {
                    main: resolve(root, 'index.html')
                }
            }
        },

        // Path resolution
        resolve: {
            alias: {
                '@': root,
                '~': root,
                'pages': join(root, 'pages'),
                'components': join(root, 'components'),
                'composables': join(root, 'composables'),
                'layouts': join(root, 'layouts'),
                'vue': 'vue/dist/vue.esm-bundler.js'
            }
        },

        // CSS configuration
        css: {
            devSourcemap: mode === 'development'
        },

        // Optimization
        optimizeDeps: {
            include: [
                'vue',
                'vue-router'
            ]
        },

        // Define global constants
        define: {
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: mode === 'development',
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: mode === 'development'
        }
    });
}
