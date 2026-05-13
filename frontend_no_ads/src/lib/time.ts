export const padTwoDigits = (value: number) => {
  const absValue = Math.floor(Math.abs(value));
  const padded = absValue < 10 ? `0${absValue}` : String(absValue);
  return value < 0 ? `-${padded}` : padded;
};
