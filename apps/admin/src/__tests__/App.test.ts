import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The generated client is stubbed so each documented status can be rendered on
// demand. What is under test is App.vue's branching, not orval's fetch wrapper.
const query = vi.hoisted(() => ({
  data: undefined as { status: number; data?: unknown } | undefined,
  isPending: false,
  isError: false,
}));

// Real refs, not plain objects: a template only unwraps refs, so `{ value: false }`
// would read as truthy and every case would render the loading branch.
vi.mock('@/api/generated/channels/channels', async () => {
  const { ref } = await import('vue');

  return {
    useGetChannelById: () => ({
      data: ref(query.data),
      isPending: ref(query.isPending),
      isError: ref(query.isError),
    }),
  };
});

const App = (await import('../App.vue')).default;

const render = () => mount(App, { global: { stubs: { VueQueryDevtools: true } } });

const channel = {
  id: 'clx1abc123def',
  twitchId: '191983746',
  login: 'luckyfoxcode',
  displayName: 'LuckyFoxCode',
  status: 'ACTIVE',
  botIsMod: true,
};

beforeEach(() => {
  query.data = undefined;
  query.isPending = false;
  query.isError = false;
});

describe('App', () => {
  it('shows the channel on 200', () => {
    query.data = { status: 200, data: channel };

    const text = render().text();
    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('ACTIVE');
  });

  it('says so on 404 rather than showing an empty panel', () => {
    query.data = { status: 404, data: { status: 'error', message: 'Channel not found' } };

    expect(render().text()).toContain('Channel not found');
  });

  // The regression this suite exists for: the fetch client resolves on every
  // status, so a 500 used to satisfy no branch at all and render nothing.
  it('surfaces a 500 instead of rendering nothing', () => {
    query.data = { status: 500, data: { status: 'error', message: 'Internal server error' } };

    const text = render().text();
    expect(text).toContain('500');
    expect(text).toContain('Internal server error');
  });

  it('surfaces an undocumented status too', () => {
    query.data = { status: 502 };

    expect(render().text()).toContain('502');
  });

  it('reports a transport failure separately from a bad response', () => {
    query.isError = true;

    expect(render().text()).toContain('Could not reach the api');
  });

  it('shows a loading state while the query is pending', () => {
    query.isPending = true;

    expect(render().text()).toContain('Loading');
  });
});
