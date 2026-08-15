import NextAuth from "next-auth";
import "./types";

import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export { authConfig };
