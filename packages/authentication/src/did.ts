type DIDService = {
  id: string;
  type: string;
  serviceEndpoint: string;
};

type DIDVerificationMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk: any; // Adjust as needed for JWK structure
};

export type DIDDocument = {
  "@context": string[];
  id: string;
  service: DIDService[];
  verificationMethod: DIDVerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
};

export function resolveNuggetsDidUrl(did: string): string {
  if (!did.startsWith("did:web:")) {
    throw new Error("Not a did:web identifier");
  }

  const parts = did.split(":").slice(2);
  const domain = parts[0];
  const path = parts.slice(1).join("/");

  const baseUrl = `https://${domain}`;

  const didPath = path
    ? `/${path}/.well-known/did.json`
    : "/.well-known/did.json";

  return `${baseUrl}${didPath}`;
}

const REQUIRED_PATHS = ["did:web", "nuggets.life"];

export function isValidDID(did: string): boolean {
  return REQUIRED_PATHS.some(($) => did.includes($));
}
