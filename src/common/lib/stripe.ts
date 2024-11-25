import Stripe from "stripe";
import { envVariables } from "@/common/env-variables";

export const stripe = new Stripe(envVariables.stripeSecretKey, {
  apiVersion: "2024-11-20.acacia",
})