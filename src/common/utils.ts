const truthyBooleans = new Set(["true", "yes", "y"]);
const falsyBooleans = new Set(["false", "no", "n"]);
const validBooleans = new Set([...truthyBooleans, ...falsyBooleans]);

export const parseBoolean = (value: string): boolean => {
  const prepared = value.trim().toLowerCase();
  if (!validBooleans.has(prepared))
    throw new Error(
      `Invalid boolean value '${value}', allowed values: ${validBooleans}`,
    );
  return truthyBooleans.has(prepared);
};

export const sleep = (seconds: number) =>
  new Promise((res) => setTimeout(res, seconds * 1000));
