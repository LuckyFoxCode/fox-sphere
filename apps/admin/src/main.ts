import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/styles/main.css';

createApp(App).use(VueQueryPlugin).mount('#app');
