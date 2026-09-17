import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
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
  deleteMutateAsync: vi.fn<(variables: { id: string }) => Promise<unknown>>(),
}));

// useToast calls vue-sonner's toast.error/success; asserting on this mock
// proves the error/success reached the toast without depending on its format.
const toastError = vi.hoisted(() => vi.fn<(message: string) => void>());
const toastSuccess = vi.hoisted(() => vi.fn<(message: string) => void>());

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
    useDeleteChannel: () => ({
      mutate: query.deleteMutate,
      mutateAsync: query.deleteMutateAsync,
    }),
  };
});

vi.mock('vue-sonner', () => ({
  toast: { error: toastError, success: toastSuccess },
}));

const ChannelView = (await import('../ChannelView.vue')).default;

const channel = {
  id: 'clx1',
  twitchId: '191983746',
  login: 'luckyfoxcode',
  displayName: 'LuckyFoxCode',
  status: 'ACTIVE',
  botIsMod: true,
};

let wrapper: VueWrapper | undefined;
let router: Router | undefined;

const mountView = async () => {
  router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/channels/clx1');
  await router.isReady();

  // Attached to document.body so the ConfirmDialog content (teleported there by
  // the reka-ui AlertDialogPortal) is reachable through document queries.
  wrapper = mount(ChannelView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });

  return wrapper;
};

beforeEach(() => {
  query.data = undefined;
  query.isPending = false;
  query.isError = false;
  query.ids = [];
  query.refetch.mockClear();
  query.patchMutate.mockClear();
  query.deleteMutate.mockClear();
  query.deleteMutateAsync.mockClear();
  toastError.mockClear();
  toastSuccess.mockClear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  router = undefined;
  document.body.innerHTML = '';
});

type MountedView = Awaited<ReturnType<typeof mountView>>;

const deleteButton = (view: MountedView) =>
  view.findAll('button').find((b) => b.text().includes('Delete channel'));

// The edit form is gated behind isEditing; enter edit mode before asserting on it.
const editButton = (view: MountedView) =>
  view.findAll('button').find((b) => b.text().trim() === 'Edit channel');

const enterEditMode = async (view: MountedView) => {
  await editButton(view)?.trigger('click');
};

// The dialog content is portaled to document.body, so it lives outside the
// wrapper. Exact text match: 'Delete' ('Delete channel' is the trigger).
const dialogContent = () =>
  document.querySelector('[data-slot="alert-dialog-content"]') as HTMLElement | null;

const dialogButton = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === text,
  );

const openDeleteDialog = async (view: MountedView) => {
  await deleteButton(view)?.trigger('click');
  await flushPromises();
  await nextTick();
  expect(dialogContent()).not.toBeNull();
};

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
    const wrapper = await mountView();
    await enterEditMode(wrapper);

    const text = wrapper.text();
    expect(text).toContain('Edit channel');
    expect(text).toContain('Status');
    expect(text).toContain('Bot is moderator');
    expect(text).toContain('Save');
  });

  it('patches the channel and refetches on success', async () => {
    query.data = { status: 200, data: channel };
    const wrapper = await mountView();
    await enterEditMode(wrapper);

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
    expect(toastSuccess).toHaveBeenCalledWith('Channel updated');
  });

  it('shows the server message when the patch fails', async () => {
    query.data = { status: 200, data: channel };
    const wrapper = await mountView();
    await enterEditMode(wrapper);

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
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('deletes the channel after confirming and navigates to the list', async () => {
    query.data = { status: 200, data: channel };
    query.deleteMutateAsync.mockResolvedValue({ status: 204, data: undefined });

    const wrapper = await mountView();
    await openDeleteDialog(wrapper);

    const confirm = dialogButton('Delete');
    expect(confirm).toBeDefined();

    await confirm?.click();
    await flushPromises();
    await nextTick();

    expect(query.deleteMutateAsync).toHaveBeenCalledTimes(1);
    expect(query.deleteMutateAsync.mock.calls[0]?.[0]).toMatchObject({ id: 'clx1' });
    expect(toastSuccess).toHaveBeenCalledWith('Channel deleted');
    expect(router?.currentRoute.value.path).toBe('/channels');
  });

  it('does not delete when the user cancels the confirm dialog', async () => {
    query.data = { status: 200, data: channel };

    const wrapper = await mountView();
    await openDeleteDialog(wrapper);

    const cancel = dialogButton('Cancel');
    expect(cancel).toBeDefined();

    await cancel?.click();
    await flushPromises();
    await nextTick();
    await nextTick();

    expect(query.deleteMutateAsync).not.toHaveBeenCalled();
    expect(dialogContent()).toBeNull();
  });

  it('keeps the dialog open and toasts the server message when the delete fails', async () => {
    query.data = { status: 200, data: channel };
    query.deleteMutateAsync.mockResolvedValue({
      status: 404,
      data: { status: 404, message: 'Channel not found' },
    });

    const wrapper = await mountView();
    await openDeleteDialog(wrapper);

    await dialogButton('Delete')?.click();
    await flushPromises();

    expect(query.deleteMutateAsync).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Channel not found');
    expect(dialogContent()).not.toBeNull();
  });
});
