import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import * as jose from "jose";
import { type DIDDocument, isValidDID, resolveNuggetsDidUrl } from "./did";

type VerifyClientInput = {
  token: string;
};

type ServicesTypes = "VerifiedInformationAPI" | "VerifiedInformationHTML";

type DIDDocumentResponse = {
  services: Record<ServicesTypes, string>;
  did: DIDDocument;
};

const { NUGGETS_DID, NUGGETS_PRIVATE_JWK } = process.env;

class InvalidAgentError extends Error {
  constructor() {
    super();
    this.message =
      "The request from the Agent is invalid. This could be a bad actor.";
  }
}

export async function startAuthentication(): Promise<string> {
  const JWK = JSON.parse(NUGGETS_PRIVATE_JWK as string) as jose.JWK;

  const privateKey = await jose.importJWK(JWK);

  return new jose.SignJWT({
    sub: NUGGETS_DID,
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

export async function resolveDID({
  token,
}: VerifyClientInput): Promise<DIDDocument> {
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded?.payload.sub) {
    throw new Error("Unable to decode the DID from the token");
  }

  const DID = decoded.payload.sub as string;

  if (!isValidDID(DID)) {
    throw new Error("Invalid DID returned from the Agent");
  }

  const resolvedWellKnownURL = resolveNuggetsDidUrl(DID);
  return request<DIDDocument>(resolvedWellKnownURL);
}

type VerifiedInfo = {
  clientId: string;
  clientName: string;
  createdAt: string;
  verifiedInformation: [];
};

export async function getVerifiedDetails(did: DIDDocument) {
  const service = did.service.find(($) => $.type === "VerifiedInformationAPI");

  if (!service) {
    throw new Error("Unable to find the verified information endpoint");
  }
  return request<VerifiedInfo>(service.serviceEndpoint);
}

export async function authenticate(
  token: string
): Promise<DIDDocumentResponse> {
  let response: DIDDocument;

  try {
    // Verify the token against the Private Key
    response = await resolveDID({ token });

    jwt.verify(token, jwkToPem(response.verificationMethod[0].publicKeyJwk), {
      algorithms: ["RS256"],
    });
  } catch (error) {
    throw new InvalidAgentError();
  }

  const normalizedServices = response.service.reduce(
    (obj, $) => ({
      ...obj,
      [$.type]: $.serviceEndpoint,
    }),
    {} as Record<ServicesTypes, string>
  );

  return {
    services: normalizedServices,
    did: response,
  };
}
