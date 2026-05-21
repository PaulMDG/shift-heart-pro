// Completeness evaluation for caregiver & client profiles.
// Returns a Green / Yellow / Red status plus a list of missing items.

export type CompletenessStatus = "green" | "yellow" | "red";

export interface CompletenessResult {
  status: CompletenessStatus;
  missing: string[];
  // Items that BLOCK scheduling — drive Red state.
  blocking: string[];
}

// ---------- Required document types ----------
export const REQUIRED_CAREGIVER_DOC_TYPES = [
  "government_id",
  "background_check",
  "cpr_first_aid",
  "tb_test",
  "hipaa_signed",
  "code_of_conduct_signed",
  "handbook_acknowledged",
] as const;

export const OPTIONAL_CAREGIVER_DOC_TYPES = [
  "cna_hha_license",
  "covid_vaccine",
  "flu_vaccine",
  "dress_code_signed",
  "ssn_verification",
] as const;

export const REQUIRED_CLIENT_DOC_TYPES = [
  "service_agreement",
  "care_plan",
  "client_rights",
  "hipaa_consent",
  "emergency_plan",
  "assessment",
] as const;

export const CAREGIVER_DOC_LABELS: Record<string, string> = {
  government_id: "Government ID",
  background_check: "Background check",
  cpr_first_aid: "CPR / First Aid",
  tb_test: "TB test",
  hipaa_signed: "HIPAA agreement",
  code_of_conduct_signed: "Code of conduct",
  handbook_acknowledged: "Handbook acknowledgment",
  cna_hha_license: "CNA / HHA license",
  covid_vaccine: "COVID vaccine",
  flu_vaccine: "Flu vaccine",
  dress_code_signed: "Dress code",
  ssn_verification: "SSN verification",
};

export const CLIENT_DOC_LABELS: Record<string, string> = {
  service_agreement: "Service agreement",
  care_plan: "Care plan",
  client_rights: "Client rights notice",
  hipaa_consent: "HIPAA consent",
  emergency_plan: "Emergency plan",
  assessment: "Assessment form",
};

interface DocRow {
  doc_type: string;
  status?: string | null;
  expiry_date?: string | null;
  file_path?: string | null;
}

function isDocSatisfied(doc?: DocRow): boolean {
  if (!doc) return false;
  if (doc.status === "missing" || doc.status === "expired") return false;
  if (doc.expiry_date) {
    const exp = new Date(doc.expiry_date);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) return false;
  }
  return Boolean(doc.file_path) || doc.status === "verified";
}

function docsByType(docs: DocRow[] | undefined): Map<string, DocRow> {
  const m = new Map<string, DocRow>();
  for (const d of docs ?? []) m.set(d.doc_type, d);
  return m;
}

// ---------- Caregiver ----------
export function evaluateCaregiverCompleteness(
  caregiver: any,
  docs: DocRow[] = [],
): CompletenessResult {
  const missing: string[] = [];
  const blocking: string[] = [];

  // Hard blockers
  if (!caregiver?.full_name?.trim()) blocking.push("Full name");
  if (caregiver?.active_status === false) blocking.push("Marked inactive");
  if (!caregiver?.phone?.trim()) blocking.push("Phone number");

  // Soft (yellow) checks
  if (!caregiver?.address?.trim()) missing.push("Home address");
  if (!caregiver?.date_of_birth) missing.push("Date of birth");
  if (!caregiver?.emergency_contact_name?.trim()) missing.push("Emergency contact");
  if (!caregiver?.employment_type) missing.push("Employment type");
  if (!caregiver?.position?.trim()) missing.push("Position");
  if (!caregiver?.pay_rate) missing.push("Pay rate");
  if (!caregiver?.tax_form_status || caregiver.tax_form_status === "pending")
    missing.push("Tax form (W-4/W-9)");

  const byType = docsByType(docs);
  for (const dt of REQUIRED_CAREGIVER_DOC_TYPES) {
    if (!isDocSatisfied(byType.get(dt))) missing.push(CAREGIVER_DOC_LABELS[dt] ?? dt);
  }

  const status: CompletenessStatus = blocking.length > 0
    ? "red"
    : missing.length > 0
      ? "yellow"
      : "green";

  return { status, missing, blocking };
}

// ---------- Client ----------
export function evaluateClientCompleteness(
  client: any,
  docs: DocRow[] = [],
): CompletenessResult {
  const missing: string[] = [];
  const blocking: string[] = [];

  if (!client?.name?.trim()) blocking.push("Client name");
  if (!client?.address?.trim()) blocking.push("Address");
  if (client?.lat == null || client?.lng == null) blocking.push("GPS coordinates");
  if (!client?.care_type?.trim() && !client?.service_type?.trim())
    blocking.push("Service / care type");
  if (!client?.emergency_contact?.trim() && !client?.emergency_phone?.trim())
    blocking.push("Emergency contact");

  if (!client?.date_of_birth) missing.push("Date of birth");
  if (!client?.phone?.trim()) missing.push("Phone number");
  if (!client?.responsible_party?.trim()) missing.push("Responsible party");
  if (!client?.billing_contact?.trim()) missing.push("Billing contact");
  if (!client?.service_start_date) missing.push("Service start date");
  if (!client?.authorized_hours_per_week) missing.push("Authorized hours");

  const byType = docsByType(docs);
  for (const dt of REQUIRED_CLIENT_DOC_TYPES) {
    if (!isDocSatisfied(byType.get(dt))) missing.push(CLIENT_DOC_LABELS[dt] ?? dt);
  }

  const status: CompletenessStatus = blocking.length > 0
    ? "red"
    : missing.length > 0
      ? "yellow"
      : "green";

  return { status, missing, blocking };
}

export function statusMeta(status: CompletenessStatus) {
  switch (status) {
    case "green":
      return { label: "Complete", className: "bg-success/15 text-success border-success/30" };
    case "yellow":
      return { label: "Missing docs", className: "bg-warning/15 text-warning border-warning/30" };
    case "red":
      return { label: "Not schedulable", className: "bg-destructive/15 text-destructive border-destructive/30" };
  }
}