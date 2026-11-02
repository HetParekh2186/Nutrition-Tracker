// Creates (or resets the password of) the public demo account. The demo
// signs in with a password held in server env vars, so recruiters get a
// one-click login without email.

import { randomUUID } from "node:crypto";

import type { scriptSql } from "./db";

export const DEFAULT_DEMO_EMAIL = "demo@mise.app";

export async function ensureDemoUser(
  sql: ReturnType<typeof scriptSql>,
  email: string,
  password: string,
): Promise<string> {
  const [existing] = await sql<{ id: string }[]>`
    select id from auth.users where email = ${email}
  `;
  let id = existing?.id;

  if (id) {
    await sql`
      update auth.users
         set encrypted_password = extensions.crypt(${password}, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at = now()
       where id = ${id}
    `;
  } else {
    id = randomUUID();
    // Same columns Supabase's own seeding guide fills; empty strings rather
    // than nulls for the token columns, which GoTrue expects.
    await sql`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', ${id}, 'authenticated',
        'authenticated', ${email},
        extensions.crypt(${password}, extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}', '{}',
        now(), now(), '', '', '', ''
      )
    `;
    await sql`
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        ${randomUUID()}, ${id}, ${id},
        ${sql.json({ sub: id, email, email_verified: true })},
        'email', now(), now(), now()
      )
    `;
  }

  // The auth trigger created public.users; mark it as the demo.
  await sql`
    update users set is_demo = true, display_name = 'Demo cook' where id = ${id}
  `;
  return id;
}
