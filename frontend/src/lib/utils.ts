export const getFlagUrl = (isoCode: string) => {
  // Flagcdn expects lowercase 2-letter codes for the URL,
  // but we can also use a lookup or a specialized 3-letter endpoint.
  // The most stable way with Alpha-3 is using the REST Countries mapping
  // or a simple lowercase conversion if your codes match their index.
  return `https://flagcdn.com/w40/${isoCode.toLowerCase().substring(0, 2)}.png`;
};
