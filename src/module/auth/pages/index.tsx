import { Card, CardDescription, CardFooter } from "@/shared/components/ui/card";
import {
  CardContent,
  CardHeader,
} from "@/shared/components/ui/card";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignInSchema, type SignInValues } from "@/shared/validators/auth";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useSignInMutation } from "@/module/auth/mutation/sign-in.mutation";
import type { ApiError } from "@/shared/types";
import { BarChart3, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function SignInPage() {
  const mutation = useSignInMutation();
  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInValues) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      const apiError = error as ApiError;
      form.setError("root", {
        type: apiError.errorCode || String(apiError.status ?? "server"),
        message: apiError.message,
      });
    }
  }

  return (
    <main className="grid min-h-screen bg-[var(--surface-page)] lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--surface-brand)] p-12 lg:flex lg:flex-col lg:justify-between" aria-labelledby="product-heading">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/8 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3 text-sm font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BarChart3 className="size-4" aria-hidden="true" /></span>
          Fineract Intelligence
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Quiet clarity for every report</p>
          <h1 id="product-heading" className="text-balance text-4xl font-semibold tracking-tight xl:text-5xl">Turn operational data into decisions, without the noise.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Create, review, and share reliable reports from one calm workspace built for focused teams.</p>
          <ul className="mt-10 grid gap-4 text-sm" aria-label="Product benefits">
            <li className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" />AI-assisted reporting with clear source context</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />Protected access to your financial workspace</li>
            <li className="flex items-center gap-3"><Sparkles className="size-4 text-primary" aria-hidden="true" />Reusable templates for recurring decisions</li>
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">Secure reporting for Apache Fineract teams.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12" aria-labelledby="sign-in-heading">
      <Card className="w-full max-w-md border-[var(--border-subtle)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]">
        <CardHeader className="space-y-2 pb-5">
          <div className="mb-3 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BarChart3 className="size-4" aria-hidden="true" /></span>
            <span className="text-sm font-semibold">Fineract Intelligence</span>
          </div>
          <h1 id="sign-in-heading" className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <CardDescription>
            Sign in to your reporting workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root?.message && (
            <div role="alert" className="mb-4 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-[var(--status-error)]">
              {form.formState.errors.root.message}
            </div>
          )}
          <form id="sign-in-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      {...field}
                      id="username"
                      type="text"
                      placeholder="Username"
                      aria-invalid={fieldState.invalid}
                      autoComplete="username"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      placeholder="Password"
                      aria-invalid={fieldState.invalid}
                      autoComplete="current-password"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Field>
            <Button
              className="w-full"
              disabled={mutation.isPending}
              type="submit"
              form="sign-in-form"
            >
              {mutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </Field>
          <p className="text-center text-xs text-muted-foreground">Access is limited to authorized team members.</p>
        </CardFooter>
      </Card>
      </section>
    </main>
  );
}
