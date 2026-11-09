export type Role = "worker" | "employer" | "admin";
export type DocState = "missing" | "submitted" | "verified";

export interface WorkerProfile {
  id: number;
  profile_photo: string | null;
  status: string;
  bio: string;
  address: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  experience_years: number;
  experience_level: "beginner" | "intermediate" | "experienced";
  availability_schedule: string[];
  daily_rate: string | null;
  availability_status: "available" | "unavailable" | "busy";
  preferred_radius: number;
  skills: string[];
  rating: string;
  review_count: number;
  reliability_score: string;
  completed_jobs: number;
  agreed_terms_at: string | null;
}

export interface EmployerProfile {
  id: number;
  profile_photo: string | null;
  status: string;
  employer_type: string;
  bio: string;
  address: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  preferred_radius: number;
  rating: string;
  review_count: number;
  completed_jobs: number;
  agreed_terms_at: string | null;
}

export interface Me {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: Role;
  phone_verified: boolean;
  email_verified?: boolean;
  worker_profile: WorkerProfile | null;
  employer_profile: EmployerProfile | null;
  verification: {
    phone: DocState; identity: DocState; face: DocState; address: DocState; complete: boolean;
    email?: DocState;
    /** Which ways of receiving a code are switched on. */
    channels?: { sms: boolean; email: boolean };
    /** True when NINs are matched automatically, which needs a selfie. */
    face_required?: boolean;
    /** Why a document was rejected or is waiting for review. */
    notes?: { identity?: string; face?: string; address?: string };
  };
}

export interface PublicWorker {
  id: number;
  user_id: number;
  full_name: string;
  profile_photo: string | null;
  bio: string;
  location: string;
  skills: string[];
  experience_level: string;
  experience_years: number;
  daily_rate: string | null;
  availability_status: string;
  rating: string;
  review_count: number;
  reliability_score: string;
  completed_jobs: number;
  is_verified: boolean;
  distance_km: number | null;
}

export interface PublicEmployer {
  id: number;
  user_id: number;
  full_name: string;
  profile_photo: string | null;
  employer_type: string;
  bio: string;
  location: string;
  rating: string;
  review_count: number;
  completed_jobs: number;
  jobs_posted: number;
  is_verified: boolean;
  verification: { identity: boolean; address: boolean; payment: boolean };
  distance_km: number | null;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  skills: string[];
}

export interface Job {
  id: number;
  employer: string;
  employer_id: number;
  employer_rating: string;
  employer_verified: boolean;
  employer_photo: string | null;
  title: string;
  description: string;
  category: string;
  required_skills: string[];
  offered_price: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  preferred_radius: number;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  distance_km: number | null;
  interested_count: number;
  my_request: { id: number; status: string; current_amount: string; last_offer_by: string; booking_id: number | null } | null;
  matched_workers?: number;
}

export interface JobSummary {
  id: number;
  title: string;
  description: string;
  category: string;
  offered_price: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number;
  status: string;
}

export interface Negotiation {
  id: number;
  sender_role: "employer" | "worker";
  sender_name: string;
  amount: string;
  message: string;
  created_at: string;
}

export interface HiringRequest {
  id: number;
  job: JobSummary;
  worker: PublicWorker;
  employer: PublicEmployer;
  initiated_by: "employer" | "worker";
  status: string;
  current_amount: string;
  last_offer_by: "employer" | "worker";
  message: string;
  negotiations: Negotiation[];
  booking_id: number | null;
  my_party: "employer" | "worker" | null;
  can_accept: boolean;
  distance_km: number | null;
}

export type BookingStatus =
  | "pending_payment" | "scheduled" | "en_route" | "arrived" | "in_progress"
  | "completed" | "confirmed" | "cancelled" | "disputed";

export interface Booking {
  id: number;
  hiring_request_id: number;
  status: BookingStatus;
  status_label: string;
  agreed_price: string;
  scheduled_date: string;
  scheduled_time: string;
  for_someone_else: boolean;
  recipient_name: string;
  recipient_relationship: string;
  recipient_phone: string;
  service_address: string;
  service_latitude: string | null;
  service_longitude: string | null;
  job: JobSummary;
  worker: PublicWorker;
  employer: PublicEmployer;
  oyacode: string | null;
  escrow: { status: string; amount: string; method: string; reference: string } | null;
  my_party: "employer" | "worker" | null;
  evidence: { id: number; kind: string; photo: string; created_at: string }[];
  tracking: {
    latitude: string | null;
    longitude: string | null;
    distance_km: number | null;
    eta_minutes: number | null;
    updated_at: string | null;
    destination: { latitude: string | null; longitude: string | null };
  };
  has_reviewed: boolean;
  dispute_id: number | null;
  en_route_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by_role: string;
  cancel_reason: string;
}

export interface Transaction {
  id: number;
  kind: string;
  kind_label: string;
  amount: string;
  status: string;
  description: string;
  created_at: string;
}

export interface WalletInfo {
  balance: string;
  pending_escrow: string;
  paystack_enabled: boolean;
  demo_payments: boolean;
  transactions: Transaction[];
}

export interface Notification {
  id: number;
  kind: string;
  title: string;
  body: string;
  data: Record<string, number>;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  booking: number;
  reviewer_name: string;
  reviewer_role: string;
  rating: number;
  comment: string;
  job_title: string;
  job_location: string;
  created_at: string;
}

export interface Dispute {
  id: number;
  ticket: string;
  booking: number;
  reason: string;
  reason_label: string;
  details: string;
  status: string;
  status_label: string;
  resolution: string;
  resolution_label: string;
  resolution_note: string;
  timeline: { key: string; label: string; description: string; state: "done" | "current" | "upcoming" }[];
  linked_evidence: { label: string; available: boolean }[];
  worker_name: string;
  job_title: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  other_user: { id: number; full_name: string; phone_number: string; role: Role; photo: string | null; online: boolean; worker_id: number | null; employer_id: number | null };
  last_message: { body: string; created_at: string; is_mine: boolean } | null;
  unread: number;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  body: string;
  is_mine: boolean;
  offer: { id: number; category: string; amount: string; location: string; status: string } | null;
  created_at: string;
}
