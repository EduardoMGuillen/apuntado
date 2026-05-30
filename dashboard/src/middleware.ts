import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => {
      const id = token?.id ?? token?.sub;
      return Boolean(id);
    },
  },
});

export const config = {
  matcher: ["/app/:path*", "/onboarding", "/bienvenida"],
};
