import { ChannelsView, ChannelView, HomeView } from '@/views';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomeView,
    },
    {
      path: '/channels',
      component: ChannelsView,
    },
    {
      path: '/channels/:id',
      component: ChannelView,
    },
  ],
});
