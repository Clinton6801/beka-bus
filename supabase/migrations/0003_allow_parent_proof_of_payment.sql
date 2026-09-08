-- Allow parents to update proof_of_payment_url on their own registrations
DROP POLICY IF EXISTS "registrations_parent_upload_proof" ON registrations;
DROP POLICY IF EXISTS "registrations_parent_update_proof" ON registrations;

-- Create new policy allowing parents to update registrations for their own students
CREATE POLICY "registrations_parent_can_update" ON registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = registrations.student_id 
    AND students.parent_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = registrations.student_id 
    AND students.parent_id = auth.uid()
  )
);
