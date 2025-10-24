export const configuration = {
  paths: {
    home: "/",
    signIn: "/sign-in",
    signUp: "/sign-up",
  },
};

export const privatePaths = ["/"];

export const publicPaths = ["/sign-in", "/sign-up"];

export const isPrivatePath = (path: string) => privatePaths.includes(path);
