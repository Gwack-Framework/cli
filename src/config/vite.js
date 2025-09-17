import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { join, resolve } from 'path';
import { gwackPlugin } from '../plugins/gwack.js';

/**
 * Get default auto-import configuration for Gwack
 * @returns {Object} Auto-import configuration
 */
function getDefaultAutoImports() {
    return {
        imports: [
            'vue',
            'vue-router',
            {
                '@gwack/frontend': [
                    'usePage',
                    'useFetch',
                    'useAsyncData',
                    'useRouter',
                    'useRoute',
                    'navigateTo',
                    'useHead',
                    'useState'
                ]
            },
            {
                'virtual:gwack-config': [
                    'useRuntimeConfig'
                ]
            }
        ],
        dts: true,
        vueTemplate: true
    };
}

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
        mode = 'development',
        // accept a full Vite overrides object under `vite`
        vite: viteOverrides = {},
        // runtime config to expose via virtual module
        runtimeConfig = {},
        // top-level build override (e.g., from CLI build)
        build: buildTopLevel
    } = options;

    // Merge environment variables into runtime config
    const envMergedRuntime = mergeEnvIntoRuntimeGwack(runtimeConfig);

    // Extract special fields from vite overrides
    const {
        autoImports: autoImportsOverride = true,
        plugins: userPlugins = [],
        build: buildOverride,
        server: serverOverride,
        resolve: resolveOverride,
        css: cssOverride,
        optimizeDeps: optimizeDepsOverride,
        define: defineOverride,
        ...restViteOverrides
    } = viteOverrides || {};

    // Defaults
    const defaultBuild = {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(root, 'index.html')
            }
        }
    };

    // precedence: default <- vite.build <- top-level build
    const mergedBuild = (() => {
        const step1 = {
            ...defaultBuild,
            ...(buildOverride || {}),
            rollupOptions: {
                ...(defaultBuild.rollupOptions || {}),
                ...((buildOverride && buildOverride.rollupOptions) || {})
            }
        };
        if (!buildTopLevel) return step1;
        return {
            ...step1,
            ...buildTopLevel,
            rollupOptions: {
                ...(step1.rollupOptions || {}),
                ...((buildTopLevel && buildTopLevel.rollupOptions) || {})
            }
        };
    })();

    // Base config built by Gwack
    const baseConfig = {
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
            ...(autoImportsOverride ? [AutoImport(
                typeof autoImportsOverride === 'object'
                    ? { ...getDefaultAutoImports(), ...autoImportsOverride }
                    : getDefaultAutoImports()
            )] : []),
            gwackPlugin({
                phpPort,
                pagesDir: join(root, 'pages'),
                serverDir: join(root, 'server'),
                runtimeConfig: envMergedRuntime
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

        // Build configuration (merged defaults + overrides)
        build: mergedBuild,

        // Path resolution
        resolve: {
            alias: {
                '@': root,
                '~': root,
                'pages': join(root, 'pages'),
                'components': join(root, 'components'),
                'composables': join(root, 'composables'),
                'layouts': join(root, 'layouts'),
                'vue': 'vue/dist/vue.esm-bundler.js',
                'gwack/config': 'virtual:gwack-config'
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
    };

    const merged = {
        ...baseConfig,
        ...restViteOverrides,
        plugins: [...baseConfig.plugins, ...userPlugins],
        server: { ...(baseConfig.server || {}), ...(serverOverride || {}) },
        resolve: { ...(baseConfig.resolve || {}), ...(resolveOverride || {}) },
        css: { ...(baseConfig.css || {}), ...(cssOverride || {}) },
        optimizeDeps: { ...(baseConfig.optimizeDeps || {}), ...(optimizeDepsOverride || {}) },
        define: { ...(baseConfig.define || {}), ...(defineOverride || {}) },
        build: mergedBuild
    };

    return defineConfig(merged);
}

function mergeEnvIntoRuntimeGwack(base = {}) {
    let result = { ...(base || {}) };

    // Support GWACK_JSON as a JSON blob
    const json = process.env.GWACK_JSON;
    if (json) {
        try {
            const parsed = JSON.parse(json);
            result = deepMerge(result, parsed);
        } catch { }
    }

    // Support GWACK__nested__keys=value and GWACK_KEY=value
    for (const [key, value] of Object.entries(process.env)) {
        if (!key.startsWith('GWACK_')) continue;
        if (key === 'GWACK_JSON') continue;

        const suffix = key.slice('GWACK_'.length);
        const parts = suffix.startsWith('_') ? suffix.split('__').filter(Boolean) : [suffix];
        const normalizedParts = parts.map(k => normalizeKey(k));
        if (normalizedParts.length === 0) continue;

        setDeep(result, normalizedParts, coerce(value));
    }

    return result;
}

function deepMerge(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return [...a, ...b];
    }
    if (isObject(a) && isObject(b)) {
        const out = { ...a };
        for (const k of Object.keys(b)) {
            out[k] = k in a ? deepMerge(a[k], b[k]) : b[k];
        }
        return out;
    }
    return b;
}

function isObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
}

function setDeep(obj, pathArr, val) {
    let cur = obj;
    for (let i = 0; i < pathArr.length - 1; i++) {
        const k = pathArr[i];
        if (!isObject(cur[k])) cur[k] = {};
        cur = cur[k];
    }
    cur[pathArr[pathArr.length - 1]] = val;
}

function normalizeKey(k) {
    // convert SCREAMING_SNAKE to camelCase for better DX
    const lower = k.toLowerCase();
    return lower.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

function coerce(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    if (!isNaN(v) && v.trim() !== '') return Number(v);
    // Try JSON for arrays/objects
    try {
        const parsed = JSON.parse(v);
        if (typeof parsed === 'object') return parsed;
    } catch { }
    return v;
}
