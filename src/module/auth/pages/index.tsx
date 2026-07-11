import { Card, CardDescription, CardFooter } from "@/shared/components/ui/card";
import {
  CardContent,
  CardHeader,
  CardTitle,
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
    <div className="h-screen flex justify-center items-center">
      <Card className="w-3xl">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Please enter your email and password to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root?.message && (
            <div className="mb-4 text-red-500 text-xs">
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
                      area-invalid={fieldState.invalid}
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
                      area-invalid={fieldState.invalid}
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
        <CardFooter>
          <Field orientation="horizontal">
            <Button
              disabled={mutation.isPending}
              type="submit"
              form="sign-in-form"
            >
              {mutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </Field>
        </CardFooter>
      </Card>
    </div>
  );
}
