"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Link, TextField } from "@heroui/react";
import { Tabs } from "@/components/storefront/ui/Tabs";
import {
  storefrontLoginSchema,
  signupSchema,
  type StorefrontLoginInput,
  type SignupInput,
} from "@/lib/validation";

const AUTH_TABS = [
  { key: "login", label: "Log In" },
  { key: "signup", label: "Sign Up" },
] as const;

type AuthTab = (typeof AUTH_TABS)[number]["key"];

export default function StorefrontLoginPage() {
  const [tab, setTab] = useState<AuthTab>("login");

  return (
    <main className="flex flex-1 items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-120 rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <Tabs
          value={tab}
          onChange={(key) => setTab(key as AuthTab)}
          tabs={AUTH_TABS.map(({ key, label }) => ({ key, label }))}
          fullWidth
          className="mb-8"
        />

        {tab === "login" ? <LoginForm /> : <SignupForm />}
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StorefrontLoginInput>({
    resolver: zodResolver(storefrontLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: StorefrontLoginInput) {
    setFormError(null);

    const response = await fetch("/api/storefront/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Invalid email/phone or password.");
      return;
    }

    router.push("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
      <p className="mt-2 text-sm text-gray-500">Log in to your Technotopia account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <TextField isRequired isInvalid={!!errors.identifier} fullWidth>
          <Label>Email or Phone</Label>
          <Input placeholder="you@example.com" {...register("identifier")} />
          <FieldError>{errors.identifier?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.password} fullWidth>
          <Label>Password</Label>
          <Input type="password" placeholder="********" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </TextField>

        <Link href="/forgot-password" className="text-sm">
          Forgot password?
        </Link>

        <Button type="submit" variant="primary" fullWidth isDisabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "" },
  });

  async function onSubmit(values: SignupInput) {
    setFormError(null);

    const response = await fetch("/api/storefront/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Could not create your account.");
      return;
    }

    router.push("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
      <p className="mt-2 text-sm text-gray-500">Shop faster, track orders, save favorites</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <TextField isRequired isInvalid={!!errors.fullName} fullWidth>
          <Label>Full Name</Label>
          <Input placeholder="Mostafa Qobadi" {...register("fullName")} />
          <FieldError>{errors.fullName?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.email} fullWidth>
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.phone} fullWidth>
          <Label>Phone Number</Label>
          <Input type="tel" placeholder="+98 912 000 00 00" {...register("phone")} />
          <FieldError>{errors.phone?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.password} fullWidth>
          <Label>Password</Label>
          <Input type="password" placeholder="********" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </TextField>

        <Button type="submit" variant="primary" fullWidth isDisabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>

        <p className="text-center text-xs text-gray-500">
          By signing up, you agree to Technotopia&apos;s <Link href="#">Terms</Link> and{" "}
          <Link href="#">Privacy Policy</Link>.
        </p>
      </form>
    </div>
  );
}
