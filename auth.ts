import NextAuth from "next-auth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaAdapter } = require("@auth/prisma-adapter");
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          onboardingStep: user.onboardingStep,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "tel" },
        otp: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        const phoneNumber = credentials?.phoneNumber as string;
        const otp = credentials?.otp as string;
        if (!phoneNumber || !otp) return null;

        const user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user || !user.smsOtpCode || !user.smsOtpExpiry) return null;

        const now = new Date();
        if (user.smsOtpCode !== otp || user.smsOtpExpiry < now) return null;

        // Clear OTP after successful use
        await prisma.user.update({
          where: { id: user.id },
          data: { smsOtpCode: null, smsOtpExpiry: null, phoneVerified: now },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          onboardingStep: user.onboardingStep,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingStep = user.onboardingStep;
        token.twoFactorEnabled = user.twoFactorEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.onboardingStep = token.onboardingStep as string;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth providers, ensure user record has onboardingStep set
      if (account?.provider === "google" || account?.provider === "facebook") {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser) return true;
        if (!dbUser.onboardingStep) {
          await prisma.user.update({
            where: { id: user.id },
            data: { onboardingStep: "PROFILE_SETUP" },
          });
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Ensure profile record exists
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    },
  },
});
