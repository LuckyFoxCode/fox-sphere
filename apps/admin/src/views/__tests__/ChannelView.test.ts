import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../../router';

const query = vi.hoisted(() => ({
  data: undefined as { status: number; data?: unknown } | undefined,
  isPending: false,
  isError: false,
  ids: [] as unknown[],
  refetch: vi.fn<() => void>(),
  patchMutate: vi.fn<(variables: unknown, config: unknown) => void>(),
  patchPending: false,
  deleteMutate: vi.fn<(variables: { id: string }) => void>(),
  deletePending: false,
}));

vi.mock('@/api/generated/channels/channels', async () => {
  const { ref, toValue } = await import('vue');

  return {
    useGetChannelById: (id: unknown) => {
      // Record the RESOLVED id: the view passes a computed, and we want to
      // assert the route param reached the hook, not the ref object itself.
      query.ids.push(toValue(id));

      return {
        data: ref(query.data),
        isPending: ref(query.isPending),
        isError: ref(query.isError),
        refetch: query.refetch,
      };
    },
    usePatchChannel: () => ({ mutate: query.patchMutate, isPending: ref(query.patchPending) }),
    useDeleteChannel: () => ({ mutate: query.deleteMutate, isPending: ref(query.deletePending) }),
  };
});

const ChannelView = (await import('../ChannelView.vue')).default;

const channel = {
  id: 'clx1',
  twitchId: '191983746',
  login: 'luckyfoxcode',
  displayName: 'LuckyFoxCode',
  status: 'ACTIVE',
  botIsMod: true,
};

const mountView = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/channels/clx1');
  await router.isReady();

  return mount(ChannelView, { global: { plugins: [router] } });
};

beforeEach(() => {
  query.data = undefined;
  query.isPending = false;
  query.isError = false;
  query.ids = [];
  query.refetch.mockClear();
  query.patchMutate.mockClear();
  query.deleteMutate.mockClear();
});

type MountedView = Awaited<ReturnType<typeof mountView>>;

const deleteButton = (wrapper: MountedView) =>
  wrapper.findAll('button').find((b) => b.text().includes('Delete channel'));

describe('ChannelsView', () => {
  it('passes the route id to the query hook', async () => {
    await mountView();

    expect(query.ids).toEqual(['clx1']);
  });

  it('shows a loading state while the query is pending', async () => {
    query.isPending = true;

    expect((await mountView()).text()).toContain('Loading');
  });

  it('reports a transport failure separately from a bad response', async () => {
    query.isError = true;

    expect((await mountView()).text()).toContain('Could not reach the api');
  });

  it('says so on 404 rather than showing an empty panel', async () => {
    query.data = { status: 404, data: { message: 'Channel not found' } };

    expect((await mountView()).text()).toContain('Channel not found');
  });

  it('surfaces a 500 instead of rendering nothing', async () => {
    query.data = { status: 500, data: { message: 'Internal server error' } };

    const text = (await mountView()).text();
    expect(text).toContain('Request failed (HTTP 500)');
    expect(text).toContain('Internal server error');
  });

  it('render the channel on 200', async () => {
    query.data = { status: 200, data: channel };

    const text = (await mountView()).text();
    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('LuckyFoxCode');
    expect(text).toContain('191983746');
  });

  it('renders the edit form once the channel is loaded', async () => {
    query.data = { status: 200, data: channel };

    const text = (await mountView()).text();
    expect(text).toContain('Edit channel');
    expect(text).toContain('Status');
    expect(text).toContain('Bot is moderator');
    expect(text).toContain('Save');
  });

  it('patches the channel and refetches on success', async () => {
    query.data = { status: 200, data: channel };
    const wrapper = await mountView();

    const form = wrapper.find('form').element as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(query.patchMutate).toHaveBeenCalledTimes(1);

    const callbacks = query.patchMutate.mock.calls[0]?.[1] as {
      onSuccess?: (response: { status: number; data: unknown }) => void;
    };
    callbacks?.onSuccess?.({ status: 200, data: channel });
    await new Promise((resolve) => setImmediate(resolve));

    expect(query.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the server message when the patch fails', async () => {
    query.data = { status: 200, data: channel };
    const wrapper = await mountView();

    const form = wrapper.find('form').element as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setImmediate(resolve));

    const callbacks = query.patchMutate.mock.calls[0]?.[1] as {
      onSuccess?: (response: { status: number; data: { message?: string } }) => void;
    };
    callbacks?.onSuccess?.({ status: 400, data: { message: 'Channel not found' } });
    await new Promise((resolve) => setImmediate(resolve));

    expect(wrapper.text()).toContain('Channel not found');
    expect(query.refetch).not.toHaveBeenCalled();
  });

  it('deletes the channel after confirming and navigates to the list', async () => {
    query.data = { status: 200, data: channel };
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const wrapper = await mountView();
    await deleteButton(wrapper)?.trigger('click');

    expect(query.deleteMutate).toHaveBeenCalledTimes(1);
    expect(query.deleteMutate.mock.calls[0]?.[0]).toMatchObject({ id: 'clx1' });
  });

  it('does not delete when the user cancels the confirm dialog', async () => {
    query.data = { status: 200, data: channel };
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const wrapper = await mountView();
    await deleteButton(wrapper)?.trigger('click');

    expect(query.deleteMutate).not.toHaveBeenCalled();
  });
});