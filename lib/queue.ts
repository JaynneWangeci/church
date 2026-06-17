import { supabaseService } from "./supabase";
import { stkPush } from "./daraja";
import type { Donation } from "@/types";

export async function enqueuePayment(donationId: string) {
  const { error } = await supabaseService.from("payment_queue").insert({
    donation_id: donationId,
    status: "pending",
  });

  if (error) {
    console.error("Failed to enqueue payment:", error);
  }
}

export async function processPayment(
  donationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: donation, error: fetchError } = await supabaseService
    .from("donations")
    .select("*")
    .eq("id", donationId)
    .single<Donation>();

  if (fetchError || !donation) {
    return { success: false, error: "Donation not found" };
  }

  try {
    const result = await stkPush(
      donation.phone!,
      donation.amount,
      "Harambee",
      "Church Donation",
    );

    if (result.ResponseCode === "0") {
      const { error: updateError } = await supabaseService
        .from("donations")
        .update({ checkout_request_id: result.CheckoutRequestID })
        .eq("id", donationId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const { error: queueError } = await supabaseService
        .from("payment_queue")
        .update({ status: "processing", attempts: 1 })
        .eq("donation_id", donationId);

      if (queueError) {
        console.error("Failed to update queue:", queueError);
      }

      return { success: true };
    }

    const { error: failError } = await supabaseService
      .from("donations")
      .update({ status: "failed" })
      .eq("id", donationId);

    if (failError) {
      console.error("Failed to mark donation failed:", failError);
    }

    await supabaseService
      .from("payment_queue")
      .update({
        status: "failed",
        attempts: 1,
        last_error: result.ResponseDescription,
      })
      .eq("donation_id", donationId);

    return { success: false, error: result.ResponseDescription };
  } catch (err) {
    await supabaseService
      .from("payment_queue")
      .update({
        status: "failed",
        attempts: 1,
        last_error: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("donation_id", donationId);

    return { success: false, error: err instanceof Error ? err.message : "STK push failed" };
  }
}
