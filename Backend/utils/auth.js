import crypto from "crypto";
import jwt from "jsonwebtoken";

const iterations = 260000;
const keylen = 32;
const digest = "sha256";

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, keylen, digest)
    .toString("hex");

  return `pbkdf2:${digest}:${iterations}$${salt}$${hash}`;
};

export const verifyPassword = async (password, hashedPassword) => {
  try {
    const [methodInfo, salt, storedHash] = hashedPassword.split("$");
    const [method, digest, iterations] = methodInfo.split(":");

    const calculatedHash = crypto
      .pbkdf2Sync(password, salt, parseInt(iterations), keylen, digest)
      .toString("hex");

    return calculatedHash === storedHash;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
};

export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.SECRET_KEY,
    { expiresIn: "24h" }
  );
};

export const getRoleText = (role) => {
  switch (role) {
    case 0:
      return "Super Admin";
    case 1:
      return "Chemical Section Head";
    case 2:
      return "Mechanical Section Head";
    case 3:
      return "Receptionist";
    case 4:
      return "Mechanical Tester";
    case 5:
      return "Chemical Tester";
    default:
      return "Unknown Role";
  }
};
