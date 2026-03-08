
-- Allow caregivers to update swap requests targeted at them (accept/decline)
CREATE POLICY "Target can update swap requests"
ON public.shift_swap_requests
FOR UPDATE
TO authenticated
USING (target_id = auth.uid() OR requester_id = auth.uid());

-- Allow viewing swap requests for shifts you're assigned to (so you can see open requests on your shifts)
DROP POLICY IF EXISTS "Users can view own swap requests" ON public.shift_swap_requests;
CREATE POLICY "Users can view relevant swap requests"
ON public.shift_swap_requests
FOR SELECT
TO authenticated
USING (
  requester_id = auth.uid() 
  OR target_id = auth.uid()
  OR shift_id IN (SELECT id FROM public.shifts WHERE caregiver_id = auth.uid())
);

-- Function to accept a swap: updates swap status and reassigns the shift atomically
CREATE OR REPLACE FUNCTION public.accept_swap_request(swap_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_id uuid;
  v_requester_id uuid;
  v_target_id uuid;
  v_status text;
BEGIN
  -- Get swap request details
  SELECT shift_id, requester_id, target_id, status
  INTO v_shift_id, v_requester_id, v_target_id, v_status
  FROM public.shift_swap_requests
  WHERE id = swap_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Swap request not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Swap request is no longer pending';
  END IF;

  -- Verify the caller is the target
  IF v_target_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the target caregiver can accept this swap';
  END IF;

  -- Update the swap request status
  UPDATE public.shift_swap_requests SET status = 'accepted' WHERE id = swap_id;

  -- Reassign the shift to the target caregiver
  UPDATE public.shifts SET caregiver_id = v_target_id, updated_at = now() WHERE id = v_shift_id;

  -- Decline all other pending swap requests for the same shift
  UPDATE public.shift_swap_requests 
  SET status = 'declined' 
  WHERE shift_id = v_shift_id AND id != swap_id AND status = 'pending';
END;
$$;

-- Function to create an open swap request (broadcast to all caregivers)
-- or a targeted swap request to a specific caregiver
CREATE OR REPLACE FUNCTION public.create_swap_request(p_shift_id uuid, p_target_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caregiver_id uuid;
  v_swap_id uuid;
BEGIN
  -- Verify the caller owns the shift
  SELECT caregiver_id INTO v_caregiver_id
  FROM public.shifts WHERE id = p_shift_id;

  IF v_caregiver_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only swap your own shifts';
  END IF;

  -- Check no pending swap already exists for this shift by this user
  IF EXISTS (
    SELECT 1 FROM public.shift_swap_requests 
    WHERE shift_id = p_shift_id AND requester_id = auth.uid() AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending swap request already exists for this shift';
  END IF;

  INSERT INTO public.shift_swap_requests (shift_id, requester_id, target_id, status)
  VALUES (p_shift_id, auth.uid(), p_target_id, 'pending')
  RETURNING id INTO v_swap_id;

  RETURN v_swap_id;
END;
$$;
