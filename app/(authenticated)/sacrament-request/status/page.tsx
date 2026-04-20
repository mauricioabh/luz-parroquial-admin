'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { RoleGuard } from '../../RoleGuard'
import {
  getMySacramentRequests,
  getSacramentDisplayName,
  getStatusBadgeVariant,
  getStatusMessage,
  getStatusDisplayName,
  type SacramentRequest,
} from '@/lib/supabase/sacrament-requests'
import {
  getDocumentsForRequest,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
  getDocumentTypeDisplayName,
  getDocumentTypeHint,
  getRecommendedDocumentTypes,
  type SacramentDocument,
  type DocumentType,
} from '@/lib/supabase/sacrament-documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { SuccessConfirmation } from '@/components/guidance/SuccessConfirmation'

export default function SacramentRequestStatusPage() {
  return (
    <RoleGuard allowedRoles={['parishioner']}>
      <SacramentRequestStatusContent />
    </RoleGuard>
  )
}

function SacramentRequestStatusContent() {
  const { profile } = useProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<SacramentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    // Check for success parameter
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      // Clear the parameter from URL
      router.replace('/sacrament-request/status', { scroll: false })
      // Hide after 8 seconds
      setTimeout(() => setShowSuccess(false), 8000)
    }
  }, [searchParams, router])

  const loadRequests = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getMySacramentRequests()
      setRequests(data)
    } catch (err) {
      console.error('Error loading requests:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las solicitudes'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-serif text-[var(--foreground)]">
            Sacramentos y Citas
          </h1>
          <p className="text-base text-[var(--muted-foreground)] font-sans">
            Rastrea el estado de tus solicitudes de sacramentos.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/sacrament-request')}
          className="w-full sm:w-auto"
        >
          Nueva Solicitud
        </Button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <SuccessConfirmation
          title="Solicitud de Sacramento Recibida"
          message="Gracias por enviar tu solicitud. Hemos recibido tu solicitud de sacramento y será revisada por la oficina parroquial."
          nextSteps="El personal parroquial revisará tu solicitud y te contactará para discutir los requisitos de preparación y la programación. Puedes rastrear el estado de tu solicitud aquí y subir los documentos requeridos según sea necesario."
          followUpTime="Puedes esperar una respuesta en unos días hábiles. Mientras tanto, puedes preparar los documentos requeridos que se pueden subir en esta página."
        />
      )}

      {/* First-time Hint */}
      <FirstTimeHint
        storageKey="sacrament_status"
        title="Seguimiento de Tus Solicitudes"
        description="Esta página muestra todas tus solicitudes de sacramentos y su estado actual. Después de enviar una solicitud, puedes subir los documentos requeridos aquí. La oficina parroquial revisará tu solicitud y te contactará sobre los próximos pasos, como requisitos de preparación y programación."
      />

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title="Aún No Hay Solicitudes de Sacramentos"
          description="Cuando envíes una solicitud de sacramento—como para Bautismo, Primera Comunión, Confirmación o Matrimonio—aparecerá aquí para que puedas rastrear su progreso."
          secondaryDescription="Después de enviar una solicitud, podrás subir los documentos requeridos, ver actualizaciones de estado y recibir mensajes de la oficina parroquial sobre los próximos pasos, incluyendo requisitos de preparación y programación."
          actionLabel="Enviar Tu Primera Solicitud"
          onAction={() => router.push('/sacrament-request')}
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-lg font-serif text-[var(--foreground)] flex-1">
                    {getSacramentDisplayName(request.sacrament_type)}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(request.status)}>
                    {getStatusDisplayName(request.status)}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  Solicitante: {request.applicant_name}
                  {request.applicant_birthdate && (
                    <> • Fecha de Nacimiento: {new Date(request.applicant_birthdate).toLocaleDateString('es-ES')}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="bg-[var(--secondary)] border-[var(--border)]">
                  <CardContent className="pt-4">
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-2">
                      {getStatusMessage(request.status)}
                    </p>
                    {request.notes && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">
                          Nota de la parroquia:
                        </p>
                        <p className="text-sm text-[var(--foreground)]">{request.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Document Upload Section */}
                <DocumentUploadSection requestId={request.id} sacramentType={request.sacrament_type} />

                <p className="text-xs text-[var(--muted-foreground)]">
                  Enviado: {new Date(request.created_at).toLocaleDateString('es-ES')} a las{' '}
                  {new Date(request.created_at).toLocaleTimeString('es-ES')}
                  {request.updated_at !== request.created_at && (
                    <>
                      {' • '}
                      Última actualización: {new Date(request.updated_at).toLocaleDateString('es-ES')} a las{' '}
                      {new Date(request.updated_at).toLocaleTimeString('es-ES')}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

interface DocumentUploadSectionProps {
  requestId: string
  sacramentType: string
}

function DocumentUploadSection({ requestId, sacramentType }: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<SacramentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType>('birth_certificate')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recommendedTypes = getRecommendedDocumentTypes(sacramentType)
  const allDocumentTypes: DocumentType[] = [
    'birth_certificate',
    'baptism_certificate',
    'first_communion_certificate',
    'confirmation_certificate',
    'marriage_certificate',
    'id_document',
    'proof_of_address',
    'other'
  ]

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const docs = await getDocumentsForRequest(requestId)
      setDocuments(docs)
    } catch (err) {
      console.error('Error loading documents:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [requestId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('El tamaño del archivo debe ser menor a 10MB')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
      if (!selectedFile) {
        setError('Por favor selecciona un archivo')
        return
      }

    setUploading(true)
    setError(null)

    try {
      await uploadDocument({
        file: selectedFile,
        sacrament_request_id: requestId,
        document_type: selectedType
      })
      await loadDocuments()
      setShowUploadForm(false)
      setSelectedFile(null)
      setSelectedType('birth_certificate')
      // Reset file input
      const fileInput = document.getElementById(`file-input-${requestId}`) as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err) {
      console.error('Error uploading document:', err)
      setError(err instanceof Error ? err.message : 'Error al subir el documento')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return
    }

    try {
      await deleteDocument(documentId)
      await loadDocuments()
    } catch (err) {
      console.error('Error deleting document:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar el documento')
    }
  }

  const handleView = async (document: SacramentDocument) => {
    try {
      const url = await getDocumentUrl(document.file_path)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Error viewing document:', err)
      setError(err instanceof Error ? err.message : 'Error al abrir el documento')
    }
  }

  return (
    <div className="pt-4 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Documentos Requeridos</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploadForm(!showUploadForm)}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {showUploadForm ? 'Cancelar' : 'Subir Documento'}
        </Button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {showUploadForm && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
                >
                  {allDocumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {getDocumentTypeDisplayName(type)}
                      {recommendedTypes.includes(type) && ' (Recomendado)'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {getDocumentTypeHint(selectedType)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Archivo <span className="text-red-500">*</span>
                </label>
                <input
                  id={`file-input-${requestId}`}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)]"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Formatos aceptados: PDF, JPEG, PNG, WebP (máx. 10MB)
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowUploadForm(false)
                    setSelectedFile(null)
                    setError(null)
                  }}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? 'Subiendo...' : 'Subir'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Cargando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Aún no se han subido documentos. Haz clic en "Subir Documento" para agregar los documentos requeridos.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-[var(--secondary)] rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {getDocumentTypeDisplayName(doc.document_type)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Subido el {new Date(doc.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(doc)}
                  className="flex-1 sm:flex-none"
                >
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
