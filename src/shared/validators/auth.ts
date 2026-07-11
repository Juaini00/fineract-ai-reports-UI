import { z } from "zod"

export const SignInSchema = z.object({
    username: z
    .string()
    .min(1, { message: "Username is required" }),
    password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
})

export type SignInValues = z.infer<typeof SignInSchema>