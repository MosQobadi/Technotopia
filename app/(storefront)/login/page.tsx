"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Link, TextField } from "@heroui/react";
import { storefrontLoginSchema, type StorefrontLoginInput } from "@/lib/validation";

export default function StorefrontLoginPage() {
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
    <main className="flex flex-1 items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-120 rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
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

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
