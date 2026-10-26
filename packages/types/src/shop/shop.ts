export interface ShopShowPayload {
  openedBy: string;
}

export interface ShopServerToClientEvents {
  "shop:show": (data: ShopShowPayload) => void;
}

export interface ShopClientToServerEvents {}
