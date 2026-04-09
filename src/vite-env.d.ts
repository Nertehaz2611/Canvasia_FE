/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type GoogleAccountsId = {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: string | number;
      logo_alignment?: "left" | "center";
    }
  ) => void;
  prompt: () => void;
};

type GoogleAccounts = {
  id: GoogleAccountsId;
};

type GoogleGlobal = {
  accounts: GoogleAccounts;
};

interface Window {
  google?: GoogleGlobal;
}

interface GlobalThis {
  google?: GoogleGlobal;
}
