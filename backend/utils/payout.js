const configuredPercent = Number(process.env.PLATFORM_FEE_PERCENT);

export const PLATFORM_FEE_PERCENT =
  Number.isFinite(configuredPercent) && configuredPercent >= 0 && configuredPercent <= 100
    ? configuredPercent
    : 5;

export const splitPayout = (total) => {
  const amount = Math.max(0, Number(total) || 0);
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
  return {
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFee,
    providerAmount: Math.round((amount - platformFee) * 100) / 100,
  };
};
