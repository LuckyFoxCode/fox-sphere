import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import 'vue-sonner/style.css';
import App from './App.vue';
import './assets/styles/main.css';
import { installSession } from './lib/session';
import { router } from './router';

installSession();

createApp(App).use(VueQueryPlugin).use(router).mount('#app');
