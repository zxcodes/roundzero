export type GoogleUserInfo = {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userResponse.ok) {
    if (userResponse.status === 400 || userResponse.status === 401) {
      throw new ExpectedError("unauthenticated", "Google sign-in expired. Please try again.");
    }
    throw new Error("Failed to fetch Google user info");
  }

  const googleUser = (await userResponse.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
    verified_email?: boolean;
  };

  return {
    id: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    verified_email: googleUser.verified_email === true,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}
import { ExpectedError } from "@/shared/expected-error";
