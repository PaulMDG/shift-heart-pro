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

    fireEvent.click(screen.getByText("CLOCK IN"));
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

    fireEvent.click(screen.getByText("CLOCK IN"));
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

    fireEvent.click(screen.getByText("CLOCK IN"));
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

    fireEvent.click(screen.getByText("CLOCK OUT"));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Describe the visit/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Care Notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Mileage Driven/i)).toBeInTheDocument();
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