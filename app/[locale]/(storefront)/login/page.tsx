"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { Link, useRouter } from "@/i18n/navigation";
import { Tabs } from "@/components/storefront/ui/Tabs";
import {
  storefrontLoginSchema,
  signupSchema,
  type StorefrontLoginInput,
  type SignupInput,
} from "@/lib/validation";

type AuthTab = "login" | "signup";

export default function StorefrontLoginPage() {
  const t = useTranslations("auth");
  const [tab, setTab] = useState<AuthTab>("login");

  const authTabs = [
    { key: "login", label: t("loginTab") },
    { key: "signup", label: t("signupTab") },
  ] as const;

  return (
    <main className="flex flex-1 items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-120 rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <Tabs
          value={tab}
          onChange={(key) => setTab(key as AuthTab)}
          tabs={authTabs.map(({ key, label }) => ({ key, label }))}
          fullWidth
          className="mb-8"
        />

        {tab === "login" ? <LoginForm /> : <SignupForm />}
      </div>
    </main>
  );
}

function LoginForm() {
  const t = useTranslations("auth.login");
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
      setFormError(result.error ?? t("errorDefault"));
      return;
    }

    router.push("/");
  }

  return (
    <div>
      <h1 className="text-heading text-gray-900">{t("heading")}</h1>
      <p className="mt-2 text-sm text-gray-500">{t("subheading")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <TextField isRequired isInvalid={!!errors.identifier} fullWidth>
          <Label>{t("emailOrPhone")}</Label>
          <Input placeholder={t("emailPlaceholder")} {...register("identifier")} />
          <FieldError>{errors.identifier?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.password} fullWidth>
          <Label>{t("password")}</Label>
          <Input type="password" placeholder="********" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </TextField>

        <Link href="/forgot-password" className="text-sm">
          {t("forgotPassword")}
        </Link>

        <Button type="submit" variant="primary" fullWidth isDisabled={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </div>
  );
}

function SignupForm() {
  const t = useTranslations("auth.signup");
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
      setFormError(result.error ?? t("errorDefault"));
      return;
    }

    router.push("/");
  }

  return (
    <div>
      <h1 className="text-heading text-gray-900">{t("heading")}</h1>
      <p className="mt-2 text-sm text-gray-500">{t("subheading")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <TextField isRequired isInvalid={!!errors.fullName} fullWidth>
          <Label>{t("fullName")}</Label>
          <Input placeholder={t("fullNamePlaceholder")} {...register("fullName")} />
          <FieldError>{errors.fullName?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.email} fullWidth>
          <Label>{t("email")}</Label>
          <Input type="email" placeholder="you@example.com" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.phone} fullWidth>
          <Label>{t("phone")}</Label>
          <Input type="tel" placeholder={t("phonePlaceholder")} {...register("phone")} />
          <FieldError>{errors.phone?.message}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.password} fullWidth>
          <Label>{t("password")}</Label>
          <Input type="password" placeholder="********" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </TextField>

        <Button type="submit" variant="primary" fullWidth isDisabled={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>

        <p className="text-center text-xs text-gray-500">
          {t.rich("agreement", {
            terms: (chunks) => <Link href="#">{chunks}</Link>,
            privacy: (chunks) => <Link href="#">{chunks}</Link>,
          })}
        </p>
      </form>
    </div>
  );
}
