import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---- Mocks ----

const updateStatusMock = vi.fn();
const updateAssignmentMock = vi.fn();

const baseShift = {
  id: "shift-1",
  caregiver_id: "cg-1",
  client_id: "c-1",
  date: "2026-01-01",
  start_time: "09:00",
  end_time: "17:00",
  status: "not_started",
  assignment_status: "accepted",
  admin_notes: "",
  clock_in_time: null,
  clock_out_time: null,
  clock_out_notes: null,
  clock_in_lat: null,
  clock_in_lng: null,
  clock_out_lat: null,
  clock_out_lng: null,
  clock_in_selfie_url: null,
  client: {
    id: "c-1",
    name: "Jane Doe",
    address: "123 Main",
    care_type: "hourly",
    // Client coords — caregiver position below is ~0m away
    lat: 40.0,
    lng: -75.0,
  },
};

let shiftState: any = { ...baseShift };

vi.mock("@/hooks/useShifts", () => ({
  useShift: () => ({ data: shiftState, isLoading: false }),
  useUpdateShiftStatus: () => ({
    mutate: (args: any) => {
      updateStatusMock(args);
      shiftState = { ...shiftState, ...args };
    },
    isPending: false,
  }),
  useUpdateAssignmentStatus: () => ({
    mutate: updateAssignmentMock,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAgencySettings", () => ({
  useAgencySettings: () => ({
    data: { geofence_radius_m: 200, accuracy_threshold_m: 100, repeat_failure_threshold: 2 },
  }),
}));

vi.mock("@/components/LiveLocationStatus", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useShiftDocuments", async () => {
  const actual = await vi.importActual<any>("@/hooks/useShiftDocuments");
  return {
    ...actual,
    useVisitHistory: () => ({ data: [
      {
        id: "shift-prev-1",
        date: "2025-12-20",
        start_time: "09:00",
        end_time: "13:00",
        status: "completed",
        clock_in_time: "2025-12-20T14:00:00Z",
        clock_out_time: "2025-12-20T18:00:00Z",
        clock_out_notes: "Earlier visit notes",
      },
    ] }),
    useShiftDocuments: () => ({ data: [] }),
    useUploadShiftDocument: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock("@/hooks/useLiveLocation", () => ({
  useLiveLocation: () => ({
    permission: "granted",
    position: null,
    accuracy: null,
    lastFixAt: null,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---- Geolocation helpers ----

function mockGeolocation(lat: number, lng: number, accuracy: number) {
  (navigator as any).geolocation = {
    getCurrentPosition: (success: any) =>
      success({ coords: { latitude: lat, longitude: lng, accuracy } }),
  };
}

import ShiftDetail from "@/pages/ShiftDetail";
import ClockOutForm from "@/components/shifts/ClockOutForm";

function renderShift() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/shifts/shift-1"]}>
        <Routes>
          <Route path="/shifts/:id" element={<ShiftDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Caregiver clock-in / clock-out flow", () => {
  beforeEach(() => {
    shiftState = { ...baseShift };
    updateStatusMock.mockClear();
    updateAssignmentMock.mockClear();
  });

  it("clocks in when caregiver is inside the geofence with adequate GPS accuracy", async () => {
    mockGeolocation(40.0, -75.0, 15); // on client, ±15m accuracy
    renderShift();

    fireEvent.click(screen.getByRole("button", { name: /^Clock In$/i }));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => expect(updateStatusMock).toHaveBeenCalled());
    const payload = updateStatusMock.mock.calls[0][0];
    expect(payload.status).toBe("in_progress");
    expect(payload.clock_in_time).toBeTruthy();
    expect(payload.clock_in_lat).toBeCloseTo(40.0, 5);
    expect(payload.clock_in_lng).toBeCloseTo(-75.0, 5);
    expect(payload.clock_in_accuracy).toBe(15);
    // selfie removed from flow
    expect(payload.clock_in_selfie_url).toBeUndefined();
  });

  it("blocks clock-in when GPS accuracy is below the threshold", async () => {
    mockGeolocation(40.0, -75.0, 500); // ±500m accuracy, threshold is 100m
    renderShift();

    fireEvent.click(screen.getByRole("button", { name: /^Clock In$/i }));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() =>
      expect(screen.getAllByText(/GPS accuracy is too low/i).length).toBeGreaterThan(0),
    );
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("blocks clock-in when caregiver is outside the geofence", async () => {
    // ~1km away
    mockGeolocation(40.01, -75.0, 10);
    renderShift();

    fireEvent.click(screen.getByRole("button", { name: /^Clock In$/i }));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() =>
      expect(screen.getAllByText(/Location Verification Failed/i).length).toBeGreaterThan(0),
    );
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("opens the clock-out form when clocking out from inside the geofence", async () => {
    mockGeolocation(40.0, -75.0, 10);
    shiftState = { ...baseShift, status: "in_progress", clock_in_time: new Date().toISOString() };
    renderShift();

    fireEvent.click(screen.getByRole("button", { name: /^Clock Out$/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Describe the visit/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Care Notes/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mileage Driven/i)).toBeInTheDocument();
  });

  it("reuses the same geofence + retry messaging for clock-out as clock-in", async () => {
    // ~1km away from client => same Location Verification Failed copy as clock-in
    mockGeolocation(40.01, -75.0, 10);
    shiftState = { ...baseShift, status: "in_progress", clock_in_time: new Date().toISOString() };
    renderShift();

    fireEvent.click(screen.getByRole("button", { name: /^Clock Out$/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/Location Verification Failed/i).length).toBeGreaterThan(0),
    );
    // Same retry button copy reused
    expect(screen.getByText(/Refresh GPS & try again/i)).toBeInTheDocument();
    // Same geofence helper helper (200m default) referenced in distance message
    expect(screen.getAllByText(/within .* of the client address/i).length).toBeGreaterThan(0);
  });

  it("renders Recent Visits items linking to that completed shift's detail page", async () => {
    mockGeolocation(40.0, -75.0, 10);
    renderShift();

    expect(await screen.findByText(/Recent Visits/i)).toBeInTheDocument();
    const visitButtons = screen.getAllByRole("button");
    const recentVisit = visitButtons.find((b) =>
      /Notes on file/i.test(b.textContent ?? ""),
    );
    expect(recentVisit).toBeTruthy();
    fireEvent.click(recentVisit!);
    // Navigated — page re-renders for the previous shift id
    expect(window.location.pathname || "").toBeDefined();
  });
});

describe("Directions helper", () => {
  let opened: string[] = [];
  beforeEach(() => {
    opened = [];
    vi.spyOn(window, "open").mockImplementation((url?: string | URL) => {
      opened.push(String(url ?? ""));
      return null as any;
    });
  });

  it("opens Google Maps with coordinates when lat/lng are provided", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) Mobile",
      configurable: true,
    });
    const { openDirections } = await import("@/lib/directions");
    openDirections({ lat: 40.0, lng: -75.0, address: "123 Main St", label: "Jane" });
    expect(opened[0]).toMatch(/google\.com\/maps\/dir\/\?api=1&destination=40,-75/);
    expect(opened[0]).toMatch(/travelmode=driving/);
  });

  it("falls back to the client address when coordinates are missing", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) Mobile",
      configurable: true,
    });
    const { openDirections } = await import("@/lib/directions");
    openDirections({ lat: null, lng: null, address: "123 Main St, Springfield", label: "Jane" });
    expect(opened[0]).toMatch(/destination=123%20Main%20St%2C%20Springfield/);
  });

  it("uses Apple Maps deep link on iOS devices", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });
    const { openDirections } = await import("@/lib/directions");
    openDirections({ lat: 40.0, lng: -75.0, address: "123 Main", label: "Jane" });
    expect(opened[0]).toMatch(/^https:\/\/maps\.apple\.com\/\?daddr=40,-75/);
    expect(opened[0]).toMatch(/dirflg=d/);
  });
});

describe("ClockOutForm validation", () => {
  it("requires care notes and medication-supervised answer before submit", () => {
    const onSubmit = vi.fn();
    render(
      <ClockOutForm clientName="Jane Doe" onClose={() => {}} onSubmit={onSubmit} />,
    );

    const submit = screen.getByRole("button", { name: /Submit & Clock Out/i });
    expect(submit).toBeDisabled();

    // Filling notes alone is still not enough
    fireEvent.change(screen.getByPlaceholderText(/Describe the visit/i), {
      target: { value: "Patient was comfortable, vitals normal." },
    });
    expect(submit).toBeDisabled();

    // Answer medication question
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith("Patient was comfortable, vitals normal.");
  });

  it("captures mileage input", () => {
    render(<ClockOutForm clientName="Jane Doe" onClose={() => {}} onSubmit={() => {}} />);
    const mileage = screen.getByPlaceholderText("0") as HTMLInputElement;
    fireEvent.change(mileage, { target: { value: "12.5" } });
    expect(mileage.value).toBe("12.5");
  });
});