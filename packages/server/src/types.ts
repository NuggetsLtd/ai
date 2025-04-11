export const validReasons = ['kyb', 'over18', 'profile', 'name', 'fullname', 'rightToWork', 'social:twitter', 'social:github'] as const
export type ValidReasons = typeof validReasons[number]

export const validScopes = ['kyb', 'over18', 'profile', 'rightToWork', 'social:twitter', 'social:github'] as const
export type ValidScopes = typeof validScopes[number]

export type OnUserConnect = string | {
  uri: string;
  payload: object;
};

export type GenerateInviteInput = {
  scope: ValidScopes
}

export type GenerateInviteOutput = {
  url: string
  ref: string
}

export type OIDCQueryResponse = {
  response: string
}

export type OIDCCachedValues = {
  nonce: string,
  code_verifier: string,
  scope: string
}

export type OIDCCallbackResponse = {
  ref: string
  type: string
  url?: URL
  username?: string
  profileImage?: URL
  givenName?: string
  familyName?: string
  over18?: string
}

export type OIDCUserInfoRespose = {
  [x: string]: any
  proof: {
    credentialSubject: {
      id?: string
      type: string
      [x: string]: any
    }
  }
}
