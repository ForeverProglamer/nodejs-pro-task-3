import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hash = (value: string): Promise<string> => {
  return bcrypt.hash(value, SALT_ROUNDS);
};

export const verifyHash = (
  hash: string,
  candidate: string,
): Promise<boolean> => {
  return bcrypt.compare(candidate, hash);
};
