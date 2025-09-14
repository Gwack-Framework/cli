import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import routes from 'virtual:gwack-routes'
import App from 'virtual:gwack-app'

// Create router with generated routes
const router = createRouter({
    history: createWebHistory(),
    routes
})

// Create Vue app
const app = createApp(App)

// Global properties
app.config.globalProperties.$fetch = async (endpoint, options = {}) => {
    const response = await fetch(`/api/${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
}

app.use(router)
app.mount('#app')

// HMR setup
if (import.meta.hot) {
    // Only handle PHP backend changes with WebSocket
    const ws = new WebSocket('ws://localhost:8081')

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'php-reload') {
            console.log('🔄 PHP backend changed, reloading...')
            window.location.reload()
        }
    }

    ws.onopen = () => {
        console.log('🔗 Connected to gwack backend HMR')
    }

    // Handle route changes
    import.meta.hot.accept('virtual:gwack-routes', (newRoutes) => {
        if (newRoutes) {
            console.log('🔄 Routes updated')
            // Update router with new routes
            router.getRoutes().forEach(route => {
                router.removeRoute(route.name)
            })
            newRoutes.default.forEach(route => {
                router.addRoute({
                    ...route,
                    component: () => import(/* @vite-ignore */ route.component)
                })
            })
        }
    })
}
