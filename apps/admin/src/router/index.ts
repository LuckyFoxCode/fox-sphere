import { ChannelsView, ChannelView, HomeView } from '@/views';
import { createRouter, createWebHistory } from 'vue-router';

export const routes = [
  { path: '/', component: HomeView },
  { path: '/channels', component: ChannelsView },
  { path: '/channels/:id', component: ChannelView },
];

export const router = createRouter({ history: createWebHistory(), routes });
