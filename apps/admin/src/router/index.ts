import {
  ChannelsView,
  ChannelView,
  ChannelUserDetailView,
  ChannelUsersView,
  HomeView,
} from '@/views';
import { createRouter, createWebHistory } from 'vue-router';

export const routes = [
  { path: '/', component: HomeView },
  { path: '/channels', component: ChannelsView },
  { path: '/channels/:login', component: ChannelView },
  { path: '/channels/:login/viewers', component: ChannelUsersView },
  // Deeper than the table, so it must come after it: `/viewers/:twitchId` and `/viewers` both
  // match the list route's prefix, and vue-router takes the first match in the array.
  { path: '/channels/:login/viewers/:twitchId', component: ChannelUserDetailView },
];

export const router = createRouter({ history: createWebHistory(), routes });