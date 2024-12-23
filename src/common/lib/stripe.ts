import Stripe from "stripe";
import { envVariables } from "@/common/env-variables";

export const stripe = new Stripe(envVariables.stripeSecretKey, {
  apiVersion: "2024-12-18.acacia"
});