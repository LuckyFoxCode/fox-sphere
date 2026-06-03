export interface RewardContext {
  userId: string;
  username: string;
}

export interface RewardHandler {
  readonly rewardTitle: string;
  execute(ctx: RewardContext): Promise<void>;
}
