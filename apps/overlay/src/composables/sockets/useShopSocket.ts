import { type ShopEventType, type WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

/**
 * `!shop` — один статус и один таймер, как у `useHeroSocket`: витрина открывается на десять
 * секунд и закрывается сама, очереди и полезной нагрузки у неё нет. Показанное одинаково для
 * всех, поэтому `openedBy` из payload не нужен: карточка нейтральна и не знает, кто позвал.
 */
const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<ShopEventType>('idle');

let isSocketInitialized = false;

export function useShopSocket(socketInstance: WidgetSocket) {
  const handleShow = () => {
    setStatusWithTimeout('show', 10000);
  };

  if (!isSocketInitialized) {
    socketInstance.on('shop:show', handleShow);

    isSocketInitialized = true;
  }

  return { currentEventType };
}
