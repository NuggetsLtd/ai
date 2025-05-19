import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import * as jose from "jose";

type VerifyClientInput = {
  token: string;
};

const NUGGETS_OAUTH_PROVIDER_URL =
  process.env.NUGGETS_OAUTH_PROVIDER_URL || "http://oauth-provider:3015";

const { NUGGETS_CLIENT_ID, NUGGETS_PRIVATE_JWK } = process.env;

export async function createToken(): Promise<string> {
  const JWK = JSON.parse(NUGGETS_PRIVATE_JWK as string) as jose.JWK;

  const privateKey = await jose.importJWK(JWK);

  return new jose.SignJWT({
    sub: NUGGETS_CLIENT_ID,
    iss: JWK.kid,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(privateKey);
}

async function request<T = any>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, init).then((response) => {
    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      return response.json() as Promise<T>;
    } else if (contentType && contentType.includes("text/")) {
      return response.text() as unknown as Promise<T>;
    } else if (response.status === 204) {
      return null as unknown as T;
    } else {
      return response as unknown as T;
    }
  });
}

export async function verify({ token }: VerifyClientInput) {
  const response = await request(
    `${NUGGETS_OAUTH_PROVIDER_URL}/did/${NUGGETS_CLIENT_ID}`
  );

  try {
    const { publicKeyJwk } = response.verificationMethod[0];

    jwt.verify(token, jwkToPem(publicKeyJwk), {
      algorithms: ["RS256"],
    });

    return { publicKey: publicKeyJwk };
  } catch (error) {
    throw new Error("Failed to authenticate the agent");
  }
}

type VerifiedInfo = {
  clientId: string;
  clientName: string;
  createdAt: string;
  verifiedInformation: [];
};

export async function returnClientVerifiedInfo() {
  const response = await fetch(
    `${NUGGETS_OAUTH_PROVIDER_URL}/verified-info/${NUGGETS_CLIENT_ID}/json`
  );

  if (response.ok) {
    const json = (await response.json()) as VerifiedInfo;

    return {
      json,
      htmlLink: `${NUGGETS_OAUTH_PROVIDER_URL}/verified-info/${NUGGETS_CLIENT_ID}/html`,
      did: `${NUGGETS_OAUTH_PROVIDER_URL}/did/${NUGGETS_CLIENT_ID}`,
    };
  }
}

export async function authenticate(token: string) {
  await verify({ token });
  return returnClientVerifiedInfo();
}
