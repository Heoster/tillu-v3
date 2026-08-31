import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "@tillu/database";
import { ValidationError, TilluError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { z } from "zod";

const logger = createLogger({ service: "auth_service" });

// ── Input schemas ─────────────────────────────────────────────────────────────

export const RegisterInputSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;

// ── Response types ────────────────────────────────────────────────────────────

export interface AuthResult {
  user: { id: string; email: string };
  access_token: string;
  refresh_token: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Handles Supabase Auth operations.
 * Uses the anon client for auth flows (Supabase Auth is designed this way).
 */
export class AuthService {
  private getAnonClient() {
    const url = process.env["SUPABASE_URL"] ?? "";
    const key = process.env["SUPABASE_ANON_KEY"] ?? "";
    return createClient(url, key);
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const parsed = RegisterInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid registration data", {
        errors: parsed.error.flatten(),
      });
    }

    const supabase = this.getAnonClient();

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
      },
    });

    if (error) {
      logger.warn("auth.register.failed", { email: parsed.data.email, error: error.message });
      throw new TilluError(error.message, "AUTH_REGISTER_FAILED", false);
    }

    if (!data.user || !data.session) {
      throw new TilluError("Registration failed — no session returned", "AUTH_REGISTER_FAILED", false);
    }

    // Create student_profile record
    const db = getServiceClient();
    const { error: profileError } = await db.from("student_profiles").insert({
      user_id: data.user.id,
      name: parsed.data.name,
      class: "12",
      board: "CBSE",
    });

    if (profileError) {
      logger.error("auth.register.profile_create_failed", {
        user_id: data.user.id,
        error: profileError.message,
      });
      // Don't block auth — profile can be completed in onboarding
    }

    logger.info("auth.register.success", { user_id: data.user.id });

    return {
      user: { id: data.user.id, email: data.user.email ?? "" },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const parsed = LoginInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid login data", { errors: parsed.error.flatten() });
    }

    const supabase = this.getAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.session) {
      throw new TilluError("Invalid email or password", "AUTH_INVALID_CREDENTIALS", false);
    }

    logger.info("auth.login.success", { user_id: data.user.id });

    return {
      user: { id: data.user.id, email: data.user.email ?? "" },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }

  async logout(accessToken: string): Promise<void> {
    const url = process.env["SUPABASE_URL"] ?? "";
    const key = process.env["SUPABASE_ANON_KEY"] ?? "";
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    await supabase.auth.signOut();
  }
}
