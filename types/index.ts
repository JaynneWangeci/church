export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  currency: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export interface Donation {
  id: string;
  campaign_id: string;
  donor_name: string | null;
  amount: number;
  method: "mpesa";
  status: "pending" | "completed" | "failed";
  checkout_request_id: string | null;
  receipt_number: string | null;
  message: string | null;
  phone: string | null;
  honored_member_id: string | null;
  created_at: string;
}

export interface Pledge {
  id: string;
  campaign_id: string;
  donor_name: string;
  amount: number;
  message: string | null;
  status: "pending" | "fulfilled" | "cancelled";
  created_at: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  council: "parish_board" | "women_council" | "men_council" | "development";
  photo_url: string | null;
  order: number;
}

export interface PaymentQueue {
  id: string;
  donation_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
}

export interface LedgerAggregates {
  total_raised: number;
  total_donors: number;
  avg_gift: number;
  mpesa_split: number;
  recent_donations: Donation[];
}
