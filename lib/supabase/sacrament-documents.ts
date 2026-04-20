'use client'

import { supabase } from './client'

export type DocumentType = 
  | 'birth_certificate'
  | 'baptism_certificate'
  | 'first_communion_certificate'
  | 'confirmation_certificate'
  | 'marriage_certificate'
  | 'id_document'
  | 'proof_of_address'
  | 'other'

export interface SacramentDocument {
  id: string
  parish_id: string
  sacrament_request_id: string
  file_path: string
  document_type: DocumentType
  uploaded_by: string
  created_at: string
}

export interface UploadDocumentInput {
  file: File
  sacrament_request_id: string
  document_type: DocumentType
}

const BUCKET_NAME = 'sacrament-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]

/**
 * Get all documents for a sacrament request
 * Parishioners: Only their own documents
 * Admins: All documents for the request
 */
export async function getDocumentsForRequest(
  sacramentRequestId: string
): Promise<SacramentDocument[]> {
  const { data, error } = await supabase
    .from('sacrament_documents')
    .select('*')
    .eq('sacrament_request_id', sacramentRequestId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch documents')
  }

  return data || []
}

/**
 * Upload a document for a sacrament request
 * Only parishioners can upload documents for their own requests
 */
export async function uploadDocument(
  input: UploadDocumentInput
): Promise<SacramentDocument> {
  const { file, sacrament_request_id, document_type } = input

  // Validate file
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File type not allowed. Allowed types: PDF, JPEG, PNG, WebP`)
  }

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be authenticated to upload documents')
  }

  // Get user's profile and the sacrament request to verify ownership and get parish_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Failed to load your profile. Please try again.')
  }

  const { data: request, error: requestError } = await supabase
    .from('sacrament_requests')
    .select('id, parish_id, user_id')
    .eq('id', sacrament_request_id)
    .single()

  if (requestError || !request) {
    throw new Error('Sacrament request not found')
  }

  if (request.user_id !== user.id) {
    throw new Error('You can only upload documents for your own requests')
  }

  if (request.parish_id !== profile.parish_id) {
    throw new Error('Parish mismatch')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${request.parish_id}/${sacrament_request_id}/${fileName}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload file')
  }

  // Create document record
  const { data: document, error: insertError } = await supabase
    .from('sacrament_documents')
    .insert({
      parish_id: request.parish_id,
      sacrament_request_id,
      file_path: filePath,
      document_type,
      uploaded_by: user.id
    })
    .select()
    .single()

  if (insertError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])
    
    throw new Error(insertError.message || 'Failed to save document record')
  }

  return document
}

/**
 * Delete a document
 * Only parishioners can delete their own documents
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  // Get the document first
  const { data: document, error: fetchError } = await supabase
    .from('sacrament_documents')
    .select('file_path, uploaded_by')
    .eq('id', documentId)
    .single()

  if (fetchError || !document) {
    throw new Error('Document not found')
  }

  // Verify ownership (RLS will also enforce this)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || document.uploaded_by !== user.id) {
    throw new Error('You can only delete your own documents')
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([document.file_path])

  if (storageError) {
    console.error('Failed to delete file from storage:', storageError)
    // Continue to delete database record even if storage deletion fails
  }

  // Delete database record
  const { error: deleteError } = await supabase
    .from('sacrament_documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to delete document')
  }

  return true
}

/**
 * Get a signed URL for viewing a document
 * Only works for documents the user has access to (via RLS)
 * URLs expire after 1 hour
 */
export async function getDocumentUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    throw new Error(error.message || 'Failed to generate document URL')
  }

  return data.signedUrl
}

/**
 * Get document type display name
 */
export function getDocumentTypeDisplayName(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    birth_certificate: 'Birth Certificate',
    baptism_certificate: 'Baptism Certificate',
    first_communion_certificate: 'First Communion Certificate',
    confirmation_certificate: 'Confirmation Certificate',
    marriage_certificate: 'Marriage Certificate',
    id_document: 'ID Document',
    proof_of_address: 'Proof of Address',
    other: 'Other Document'
  }
  return names[type]
}

/**
 * Get document type hints/description
 */
export function getDocumentTypeHint(type: DocumentType): string {
  const hints: Record<DocumentType, string> = {
    birth_certificate: 'Official birth certificate issued by civil authorities',
    baptism_certificate: 'Certificate of baptism from the church where you were baptized',
    first_communion_certificate: 'Certificate of first communion',
    confirmation_certificate: 'Certificate of confirmation',
    marriage_certificate: 'Official marriage certificate or certificate from previous marriage (if applicable)',
    id_document: 'Government-issued ID (driver\'s license, passport, etc.)',
    proof_of_address: 'Utility bill, lease, or other proof of residence',
    other: 'Any other document required for this sacrament request'
  }
  return hints[type]
}

/**
 * Get recommended document types for a sacrament type
 */
export function getRecommendedDocumentTypes(
  sacramentType: string
): DocumentType[] {
  switch (sacramentType) {
    case 'baptism':
      return ['birth_certificate', 'id_document']
    case 'first_communion':
      return ['baptism_certificate', 'birth_certificate']
    case 'confirmation':
      return ['baptism_certificate', 'first_communion_certificate']
    case 'marriage':
      return [
        'birth_certificate',
        'baptism_certificate',
        'confirmation_certificate',
        'id_document',
        'proof_of_address'
      ]
    default:
      return []
  }
}

