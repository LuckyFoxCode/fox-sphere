import { ChannelsView, ChannelView, ChannelUsersView, HomeView } from '@/views';
import { createRouter, createWebHistory } from 'vue-router';

export const routes = [
  { path: '/', component: HomeView },
  { path: '/channels', component: ChannelsView },
  { path: '/channels/:login', component: ChannelView },
  { path: '/channels/:login/viewers', component: ChannelUsersView },
];

export const router = createRouter({ history: createWebHistory(), routes });
