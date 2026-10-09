import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import 'vue-sonner/style.css';
import App from './App.vue';
import './assets/styles/main.css';
import { installAdminKey } from './lib/api-key';
import { router } from './router';

installAdminKey();

createApp(App).use(VueQueryPlugin).use(router).mount('#app');
