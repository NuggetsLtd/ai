import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import * as jose from "jose";

type VerifyClientInput = {
  clientId: string;
  token: string;
};

const NUGGETS_OAUTH_PROVIDER_URL =
  process.env.NUGGETS_OAUTH_PROVIDER_URL || "http://oauth-provider:3015";

const { NUGGETS_CLIENT_ID, NUGGETS_PRIVATE_JWK } = process.env;

export async function createToken() {
  const JWK = JSON.parse(NUGGETS_PRIVATE_JWK) as jose.JWK;

  const privateKey = await jose.importJWK(JWK);

  return new jose.SignJWT({
    sub: NUGGETS_CLIENT_ID,
    iss: JWK.kid,
  })
    .setProtectedHeader({ alg: "RS256" })
<<<<<<< HEAD
    .setIssuedAt()
    .setExpirationTime("30s")
=======
>>>>>>> 20336e2 (Added the a2a agent code)
    .sign(privateKey);
}

export async function verifyClient({ clientId, token }: VerifyClientInput) {
  const response = await fetch(`${NUGGETS_OAUTH_PROVIDER_URL}/did/${clientId}`);

  if (response.ok) {
    const json = (await response.json()) as any;

    try {
      const verifyResponse = jwt.verify(
        token,
        jwkToPem(json.verificationMethod[0].publicKeyJwk),
        {
          algorithms: ["RS256"],
        }
      );

      return verifyResponse;
    } catch (error) {
      console.log("handle error");
    }
  }
}
