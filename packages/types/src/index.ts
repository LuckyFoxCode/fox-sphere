import {
  HeroClientToServerEvents,
  HeroServerToClientEvents,
} from "./hero";
import {
  LotteryClientToServerEvents,
  LotteryServerToClientEvents,
} from "./lottery";
import {
  RouletteClientToServerEvents,
  RouletteServerToClientEvents,
} from "./roulette";
import {
  StreamClientToServerEvents,
  StreamServerToClientEvents,
} from "./stream";
import {
  TwitchClientToServerEvents,
  TwitchServerToClientEvents,
} from "./twitch";
import {
  UserClientToServerEvents,
  UserServerToClientEvents,
} from "./user";

export * from "./hero/index";
export * from "./lottery/index";
export * from "./roulette/index";
export * from "./stream/index";
export * from "./twitch/index";
export * from "./user/index";

type IntersectionFromTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head & IntersectionFromTuple<Tail>
  : unknown;

type AllServerEvents = [
  HeroServerToClientEvents,
  LotteryServerToClientEvents,
  RouletteServerToClientEvents,
  StreamServerToClientEvents,
  TwitchServerToClientEvents,
  UserServerToClientEvents,
];
type AllClientEvents = [
  HeroClientToServerEvents,
  LotteryClientToServerEvents,
  RouletteClientToServerEvents,
  StreamClientToServerEvents,
  TwitchClientToServerEvents,
  UserClientToServerEvents,
];

export type ServerToClientEvents = IntersectionFromTuple<AllServerEvents>;
export type ClientToServerEvents = IntersectionFromTuple<AllClientEvents>;