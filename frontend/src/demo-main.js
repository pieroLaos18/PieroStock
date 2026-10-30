import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';
import DemoView from './views/DemoView.vue';
import './assets/css/global.css';
import '@fortawesome/fontawesome-free/css/all.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/demo' },
    { path: '/demo', component: DemoView, props: { standalone: true } },
    { path: '/:pathMatch(.*)*', redirect: '/demo' },
  ],
});

createApp({ render: () => h(RouterView) }).use(router).mount('#app');
