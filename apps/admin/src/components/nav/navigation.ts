import { LayoutDashboard, TvMinimalPlay } from '@lucide/vue';
import type { Component } from 'vue';

export interface NavItem {
  title: string;
  url: string;
  icon: Component;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Channels', url: '/channels', icon: TvMinimalPlay },
];
