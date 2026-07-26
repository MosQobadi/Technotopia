"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Link, TextField } from "@heroui/react";
import { loginSchema, type LoginInput } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Invalid email or password.");
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-120 rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Login</h1>
        <p className="mt-2 text-sm text-gray-500">Technotopia back-office access</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
          {formError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </p>
          )}

          <TextField isRequired isInvalid={!!errors.email} fullWidth>
            <Label>Email</Label>
            <Input type="email" placeholder="admin@technotopia.com" {...register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
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
    </main>
  );
}
