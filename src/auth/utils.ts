import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = (value: string): Promise<string> => {
  return bcrypt.hash(value, SALT_ROUNDS);
};

export const verifyPassword = (
  hashed: string,
  candidate: string,
): Promise<boolean> => {
  return bcrypt.compare(candidate, hashed);
};
