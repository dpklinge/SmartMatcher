import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboardingStep: string;
      twoFactorEnabled: boolean;
    };
  }

  interface User {
    id: string;
    onboardingStep: string;
    twoFactorEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingStep: string;
    twoFactorEnabled: boolean;
    requires2FA?: boolean;
  }
}
