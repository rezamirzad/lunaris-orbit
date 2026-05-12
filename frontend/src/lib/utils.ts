export const getFlagUrl = (isoCode: string) => {
  return `https://flagcdn.com/w40/${isoCode.toLowerCase().substring(0, 2)}.png`;
};

/**
 * Standardized formatters to prevent hydration mismatches between SSR and CSR.
 * Using 'en-US' as the fixed locale.
 */
export const formatCurrency = (value: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPrice = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(value);
};
