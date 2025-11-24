import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  todo: ["create", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const member = ac.newRole({
  todo: ["update"],
});

export const admin = ac.newRole({
  todo: ["create", "update", "delete"],
});

export const owner = ac.newRole({
  todo: ["create", "update", "delete"],
});

export const roles = { member, admin, owner };
