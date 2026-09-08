# Supabase Storage Setup

## Create Payment Receipts Bucket

To enable payment receipt uploads, create a private Storage bucket in your Supabase project:

### Steps:

1. **Go to Supabase Dashboard** → Your Project → **Storage** (in left sidebar)

2. **Create new bucket** → Click "+ New Bucket"

3. **Bucket Details:**
   - Name: `payment-receipts`
   - Privacy: **Private** (checked)
   - Click **Create Bucket**

4. **Set Bucket Policies**

   After creation, go to the bucket's **Policies** tab and add this policy:

   ```sql
   -- Allow authenticated users to upload to their own folder
   CREATE POLICY "Allow authenticated users to upload their receipts"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'payment-receipts' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Allow authenticated users to read their own receipts
   CREATE POLICY "Allow authenticated users to read their receipts"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'payment-receipts' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Allow staff to read all receipts
   CREATE POLICY "Allow staff to read all receipts"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'payment-receipts' AND
     EXISTS (
       SELECT 1 FROM staff WHERE staff.id = auth.uid()
     )
   );
   ```

5. **Done!** The bucket is now ready for receipt uploads.

## File Structure

Receipts are stored in this structure:
```
payment-receipts/
  {parent_id}/
    {registration_id}/
      {registration_id}-{timestamp}.{ext}
```

Example:
```
payment-receipts/
  a1b2c3d4-e5f6-7890-abcd-ef1234567890/
    x9y8z7w6-v5u4t3s2r1q0p9-o8n7m6l5/
      x9y8z7w6-v5u4t3s2r1q0p9-o8n7m6l5-1694280932000.jpg
```

## Testing

Once set up:

1. Log in as a parent at `/parent/login`
2. Register a child (creates a pending registration)
3. Scroll to "📄 Payment Proof" section
4. Upload a JPG, PNG, or PDF file
5. Verify receipt appears in the UI
6. Log in as staff at `/accounts/login`
7. View registration details to see the receipt

## Troubleshooting

- **Upload fails:** Check bucket policies and make sure the user is authenticated
- **Receipt not visible:** Verify the file was uploaded to storage bucket first
- **Signed URL errors:** Ensure staff user is in the staff table with proper role
