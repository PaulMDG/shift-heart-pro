import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---- Mocks ----

const upsertMock = vi.fn().mockResolvedValue({});
const updateStatusMock = vi.fn().mockResolvedValue({});
const toastError = vi.fn();
const toastSuccess = vi.fn();

const baseShift = {
  id: "shift-1",
  status: "in_progress",
  date: "2026-01-01",
  start_time: "09:00",
  end_time: "17:00",
  client: {
    id: "c-1",
    name: "Jane Doe",
    address: "123 Main",
    care_type: "hourly",
    lat: 40.0,
    lng: -75.0,
  },
};

let shiftState: any = { ...baseShift };

vi.mock("@/hooks/useShifts", () => ({
  useShift: () => ({ data: shiftState, isLoading: false }),
  useUpdateShiftStatus: () => ({
    mutateAsync: (args: any) => {
      updateStatusMock(args);
      return Promise.resolve();
    },
    isPending: false,
  }),
}));

// A fully-populated existing summary so the checklist starts at 100% and the
// Save & Clock Out button is enabled immediately.
const fullSummary = {
  id: "sum-1",
  shift_id: "shift-1",
  meals_status: "Full",
  medications_status: "Given",
  medications_count: 2,
  hydration: "Adequate",
  bowel_movement: "Normal",
  mobility_assisted: false,
  incident_severity: "None",
  incident_note: null,
  notes_text: "All good",
  voice_url: null,
  photo_urls: [],
  visibility: "family_care_team",
  submitted_at: null,
};

vi.mock("@/hooks/useCareSummary", () => ({
  useCareSummary: () => ({ data: fullSummary, isLoading: false }),
  useUpsertCareSummary: () => ({
    mutateAsync: (args: any) => {
      upsertMock(args);
      return Promise.resolve(args);
    },
    isPending: false,
  }),
  useQuickNoteTemplates: () => ({ data: [] }),
  useAddQuickNoteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  DEFAULT_QUICK_NOTES: [],
}));

vi.mock("@/hooks/useAgencySettings", () => ({
  useAgencySettings: () => ({ data: { accuracy_threshold_m: 100 } }),
}));

vi.mock("@/hooks/useVoiceRecorder", () => ({
  useVoiceRecorder: () => ({ isRecording: false, seconds: 0, start: vi.fn(), stop: vi.fn() }),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: (...a: any[]) => toastSuccess(...a), error: (...a: any[]) => toastError(...a), warning: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u-1" } } }) },
    storage: { from: () => ({ upload: vi.fn(), createSignedUrl: vi.fn() }) },
  },
}));

// ---- Geolocation helpers ----
function mockGeolocation(lat: number, lng: number, accuracy: number) {
  (navigator as any).geolocation = {
    getCurrentPosition: (success: any) =>
      success({ coords: { latitude: lat, longitude: lng, accuracy } }),
  };
}

import CareNotesPage from "@/pages/CareNotesPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/shifts/shift-1/care-notes"]}>
        <Routes>
          <Route path="/shifts/:id/care-notes" element={<CareNotesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CareNotesPage — GPS verification on Save & Clock Out", () => {
  beforeEach(() => {
    shiftState = { ...baseShift };
    upsertMock.mockClear();
    updateStatusMock.mockClear();
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  it("clocks out when caregiver is inside the geofence with good GPS accuracy", async () => {
    mockGeolocation(40.0, -75.0, 15);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Save & Clock Out/i }));

    await waitFor(() => expect(updateStatusMock).toHaveBeenCalled());
    const payload = updateStatusMock.mock.calls[0][0];
    expect(payload.status).toBe("completed");
    expect(payload.clock_out_lat).toBeCloseTo(40.0, 5);
    expect(payload.clock_out_lng).toBeCloseTo(-75.0, 5);
    expect(payload.clock_out_accuracy).toBe(15);
    expect(upsertMock).toHaveBeenCalled();
  });

  it("blocks clock-out when GPS accuracy is below threshold", async () => {
    mockGeolocation(40.0, -75.0, 500);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Save & Clock Out/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/GPS accuracy is too low/i).length).toBeGreaterThan(0),
    );
    expect(updateStatusMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("GPS accuracy not met");
  });

  it("blocks clock-out when caregiver is outside the geofence", async () => {
    // ~1km away
    mockGeolocation(40.01, -75.0, 10);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Save & Clock Out/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/from Jane Doe/i).length).toBeGreaterThan(0),
    );
    expect(updateStatusMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Too far from client");
  });

  it("blocks clock-out when client coordinates are not configured", async () => {
    mockGeolocation(40.0, -75.0, 10);
    shiftState = { ...baseShift, client: { ...baseShift.client, lat: null, lng: null } };
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Save & Clock Out/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/Client location is not configured/i).length).toBeGreaterThan(0),
    );
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("only saves the summary (no clock-out) when shift is already completed", async () => {
    mockGeolocation(40.0, -75.0, 10);
    shiftState = { ...baseShift, status: "completed" };
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Save Visit Summary/i }));

    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    // No GPS verification, no status update when already completed
    expect(updateStatusMock).not.toHaveBeenCalled();
  });
});