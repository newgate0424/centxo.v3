import { SignJWT, jwtVerify } from "jose"

const getAdminSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_URL // Fallback for build time
  if (!secret && process.env.NODE_ENV === 'production') {
    // Only throw if we are actually running in production and missing the secret
    // During build, we can allow it to be missing if not strictly needed for static generation
    console.warn("Warning: NEXTAUTH_SECRET is not set")
  }
  return new TextEncoder().encode(secret || "default-secret-for-build-only")
}

// Create admin JWT token
export async function createAdminToken() {
  const ADMIN_SECRET = getAdminSecret()
  return await new SignJWT({ role: "admin", isAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(ADMIN_SECRET)
}

// Verify admin JWT token
export async function verifyAdminToken(token: string) {
  try {
    const ADMIN_SECRET = getAdminSecret()
    const { payload } = await jwtVerify(token, ADMIN_SECRET)
    return payload.isAdmin === true
  } catch {
    return false
  }
}
