-- Create public storage bucket for event images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS Policies for event-images bucket

-- Allow public to view/download images
CREATE POLICY "Anyone can view event images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

-- Allow admins and staff to upload images
CREATE POLICY "Admins and staff can upload event images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Allow admins and staff to update images
CREATE POLICY "Admins and staff can update event images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Allow admins and staff to delete images
CREATE POLICY "Admins and staff can delete event images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);