'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { RoleGuard } from '../../RoleGuard'
import {
  getSacramentRequestsFiltered,
  updateSacramentRequestStatus,
  getSacramentDisplayName,
  getStatusBadgeVariant,
  getStatusDisplayName,
  type SacramentRequestWithUser,
  type SacramentType,
  type RequestStatus,
} from '@/lib/supabase/sacrament-requests'
import {
  getDocumentsForRequest,
  getDocumentUrl,
  getDocumentTypeDisplayName,
  type SacramentDocument,
} from '@/lib/supabase/sacrament-documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { Textarea } from '@/components/ui/Textarea'
import { translateError } from '@/lib/errors'
import { EmptyState } from '@/components/guidance/EmptyState'
import { FirstTimeHint } from '@/components/guidance/FirstTimeHint'
import { ActionConfirmation } from '@/components/guidance/ActionConfirmation'

// Cache to show data immediately when navigating back (avoids "Cargando" flash)
let sacramentRequestsCache: {
  data: SacramentRequestWithUser[]
  filterSacrament: SacramentType | 'all'
  filterStatus: RequestStatus | 'all'
} | null = null

export default function SacramentRequestsPage() {
  return (
    <RoleGuard requireAdmin={true}>
      <SacramentRequestsContent />
    </RoleGuard>
  )
}

function SacramentRequestsContent() {
  const { profile } = useProfile()
  const [filterSacrament, setFilterSacrament] = useState<SacramentType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all')
  // Initialize from cache if available for current filters (avoids loading flash when navigating back)
  const [requests, setRequests] = useState<SacramentRequestWithUser[]>(() => {
    if (sacramentRequestsCache && sacramentRequestsCache.filterSacrament === 'all' && sacramentRequestsCache.filterStatus === 'all') {
      return sacramentRequestsCache.data
    }
    return []
  })
  const [loading, setLoading] = useState(() => !sacramentRequestsCache || sacramentRequestsCache.filterSacrament !== 'all' || sacramentRequestsCache.filterStatus !== 'all')
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<SacramentRequestWithUser | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [documents, setDocuments] = useState<SacramentDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<{
    title: string
    message: string
    affectedItems: string[]
    nextSteps: string
  } | null>(null)

  const loadRequests = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    // Only show loading when we don't have cached data for current filters
    const hasCacheForFilters = sacramentRequestsCache &&
      sacramentRequestsCache.filterSacrament === filterSacrament &&
      sacramentRequestsCache.filterStatus === filterStatus
    if (!hasCacheForFilters) {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await Promise.race([
        getSacramentRequestsFiltered({
          sacrament_type: filterSacrament === 'all' ? undefined : filterSacrament,
          status: filterStatus === 'all' ? undefined : filterStatus,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('La carga tardó demasiado. Intenta de nuevo.')), 15000)
        ),
      ])
      setRequests(data)
      sacramentRequestsCache = { data, filterSacrament, filterStatus }
    } catch (err) {
      setError(translateError(err, { action: 'load sacrament requests', resource: 'sacrament requests' }))
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, filterSacrament, filterStatus])

  const handleUpdateStatus = async (requestId: string, newStatus: RequestStatus, notes: string) => {
    try {
      const request = requests.find(req => req.id === requestId)
      await updateSacramentRequestStatus(requestId, {
        status: newStatus,
        notes: notes || null,
      })
      
      // Show confirmation
      if (request) {
        const statusDisplayName = getStatusDisplayName(newStatus)
        setConfirmationMessage({
          title: 'Solicitud de sacramento actualizada',
          message: `La solicitud de sacramento ha sido actualizada exitosamente.`,
          affectedItems: [
            `Solicitante: ${request.applicant_name}`,
            `Sacramento: ${getSacramentDisplayName(request.sacrament_type)}`,
            `Estado: ${statusDisplayName}`,
          ],
          nextSteps: newStatus === 'approved' 
            ? 'El feligrés verá que su solicitud ha sido aprobada. Puedes continuar procesando el sacramento.'
            : newStatus === 'rejected'
            ? 'El feligrés verá que su solicitud ha sido rechazada. Pueden enviar una nueva solicitud si es necesario.'
            : 'El feligrés verá el estado actualizado en su panel. Continúa procesando la solicitud según sea necesario.',
        })
        setShowConfirmation(true)
        
        // Auto-dismiss confirmation after 8 seconds
        setTimeout(() => {
          setShowConfirmation(false)
          setConfirmationMessage(null)
        }, 8000)
      }
      
      await loadRequests()
      setShowUpdateModal(false)
      
      // Update selected request if it's the one being updated
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({
          ...selectedRequest,
          status: newStatus,
          notes: notes || null,
        })
      }
    } catch (err) {
      setError(translateError(err, { action: 'update sacrament request status', resource: 'sacrament request' }))
    }
  }

  const handleViewRequest = async (request: SacramentRequestWithUser) => {
    setSelectedRequest(request)
    setShowDrawer(true)
    setLoadingDocs(true)
    setError(null)

    try {
      const docs = await getDocumentsForRequest(request.id)
      setDocuments(docs)
    } catch (err) {
      setError(translateError(err, { action: 'load documents', resource: 'documents' }))
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleCloseDrawer = () => {
    setShowDrawer(false)
    setSelectedRequest(null)
    setDocuments([])
  }

  const handleViewDocument = async (document: SacramentDocument) => {
    try {
      const url = await getDocumentUrl(document.file_path)
      window.open(url, '_blank')
    } catch (err) {
      setError(translateError(err, { action: 'open document', resource: 'document' }))
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-foreground mb-2">
          Solicitudes de Sacramentos
        </h1>
        <p className="text-muted-foreground text-lg">
          Revisa y gestiona solicitudes de sacramentos de los feligreses
        </p>
      </div>

      {/* First-time Hint */}
      <FirstTimeHint
        storageKey="admin_sacrament_requests"
        title="Gestión de Solicitudes de Sacramentos"
        description="Los feligreses envían solicitudes de sacramentos—para Bautismo, Primera Comunión, Confirmación o Matrimonio—a través de su panel. Pueden subir documentos requeridos como actas de nacimiento, certificados de bautismo y otros materiales de apoyo. Aquí puedes revisar cada solicitud, ver los documentos subidos y actualizar el estado mientras las procesas."
      />

      {/* Action Confirmation */}
      {showConfirmation && confirmationMessage && (
        <div className="mb-6">
          <ActionConfirmation
            title={confirmationMessage.title}
            message={confirmationMessage.message}
            affectedItems={confirmationMessage.affectedItems}
            nextSteps={confirmationMessage.nextSteps}
          />
        </div>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-8 pb-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Tipo de Sacramento
            </label>
            <select
              value={filterSacrament}
              onChange={(e) => setFilterSacrament(e.target.value as SacramentType | 'all')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">Todos los Tipos</option>
              <option value="baptism">Bautismo</option>
              <option value="first_communion">Primera Comunión</option>
              <option value="confirmation">Confirmación</option>
              <option value="marriage">Matrimonio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RequestStatus | 'all')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">Todos los Estados</option>
              <option value="submitted">Enviado</option>
              <option value="in_review">En Revisión</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilterSacrament('all')
                setFilterStatus('all')
              }}
              className="w-full"
            >
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Inbox-style List - show cached requests while refetching when navigating back */}
      {loading && requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando solicitudes de sacramentos...</p>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title="No Hay Solicitudes de Sacramentos"
          description="Las solicitudes de sacramentos de los feligreses aparecerán aquí. Cuando un feligrés envía una solicitud de Bautismo, Primera Comunión, Confirmación o Matrimonio, verás el nombre del solicitante, el tipo de sacramento y cualquier documento subido."
          secondaryDescription="Los feligreses envían solicitudes a través de su panel y pueden subir los documentos requeridos. Una vez que una solicitud aparezca aquí, puedes revisar los detalles, ver los documentos y actualizar el estado mientras procesas la solicitud. El feligrés verá las actualizaciones de estado en su propio panel."
          actionLabel="Limpiar Filtros"
          onAction={() => {
            setFilterSacrament('all')
            setFilterStatus('all')
          }}
        />
      ) : (
        <div className="space-y-0">
          {requests.map((request, index) => (
            <div
              key={request.id}
              className={`
                border-b border-border 
                py-4 px-2 
                hover:bg-secondary 
                transition-colors 
                cursor-pointer
                ${index === 0 ? 'border-t' : ''}
              `}
              onClick={() => handleViewRequest(request)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-serif text-foreground">
                      {getSacramentDisplayName(request.sacrament_type)}
                    </span>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {getStatusDisplayName(request.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>{request.applicant_name}</span>
                    {request.user_name && (
                      <>
                        {' • '}
                        <span>Solicitado por {request.user_name}</span>
                      </>
                    )}
                    {' • '}
                    <span>{new Date(request.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={handleCloseDrawer}
        title={selectedRequest ? getSacramentDisplayName(selectedRequest.sacrament_type) : 'Detalles de la Solicitud'}
        size="lg"
      >
        {selectedRequest && (
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>
                  {getStatusDisplayName(selectedRequest.status)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedRequest.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Solicitante
                  </h3>
                  <p className="text-foreground">{selectedRequest.applicant_name}</p>
                </div>

                {selectedRequest.applicant_birthdate && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Fecha de nacimiento
                    </h3>
                    <p className="text-foreground">
                      {new Date(selectedRequest.applicant_birthdate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedRequest.user_name && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Solicitado por
                    </h3>
                    <p className="text-foreground">{selectedRequest.user_name}</p>
                  </div>
                )}

                {selectedRequest.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Notas
                    </h3>
                    <div className="p-4 bg-secondary rounded-md">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedRequest.notes}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Documentos
                  </h3>
                  {loadingDocs ? (
                    <p className="text-sm text-muted-foreground">Cargando documentos...</p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No se han subido documentos para esta solicitud.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-secondary rounded-md"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {getDocumentTypeDisplayName(doc.document_type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Subido el {new Date(doc.created_at).toLocaleDateString('es-ES')} a las{' '}
                              {new Date(doc.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDocument(doc)
                            }}
                          >
                            Ver
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowUpdateModal(true)
                  }}
                >
                  Actualizar Estado
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Update Status Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false)
          setSelectedRequest(null)
        }}
        title="Actualizar Estado de Solicitud de Sacramento"
      >
        {selectedRequest && (
          <UpdateStatusForm
            request={selectedRequest}
            onUpdate={handleUpdateStatus}
            onCancel={() => {
              setShowUpdateModal(false)
              setSelectedRequest(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

interface UpdateStatusFormProps {
  request: SacramentRequestWithUser
  onUpdate: (requestId: string, status: RequestStatus, notes: string) => Promise<void>
  onCancel: () => void
}

function UpdateStatusForm({ request, onUpdate, onCancel }: UpdateStatusFormProps) {
  const [status, setStatus] = useState<RequestStatus>(request.status)
  const [notes, setNotes] = useState(request.notes || '')
  const [updating, setUpdating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    try {
      await onUpdate(request.id, status, notes)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="p-6">
      {request && (
        <>
          <div className="mb-4 p-4 bg-secondary rounded-lg">
            <p className="font-medium text-sm mb-1">Detalles de la Solicitud:</p>
            <p className="text-sm text-foreground mb-2">
              {getSacramentDisplayName(request.sacrament_type)} - {request.applicant_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Solicitado por {request.user_name || 'feligrés'} el{' '}
              {new Date(request.created_at).toLocaleDateString('es-ES')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Estado
              </label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
              >
                <option value="submitted">Enviado</option>
                <option value="in_review">En Revisión</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Notas (Opcional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega cualquier nota sobre esta solicitud..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={updating}
              >
                {updating ? 'Guardando cambios...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

