export type Notification = {
  ref: string;
  status: string;
  outcome?: {
    verified: boolean;
    error?: string;
    proof?: {
      type: string;
      over18?: boolean;
      url?: URL;
      username?: string;
      profileImage?: URL;
    };
  }
}
