-- Fix infinite recursion between documents and document_shares policies
-- The document_shares SELECT policy references documents, which references document_shares back

-- Drop the problematic document_shares SELECT policy
DROP POLICY IF EXISTS "Users can view shares for their documents or documents shared w" ON public.document_shares;

-- Recreate without referencing documents table (break the cycle)
CREATE POLICY "Users can view shares for their documents or shared with them"
ON public.document_shares
FOR SELECT
USING (
  shared_with = auth.uid() 
  OR shared_by = auth.uid()
);
