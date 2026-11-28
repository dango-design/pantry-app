import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAllergyStore } from '@/allergy/store'
import { AllergyProfileEditor } from '@/components/allergy'
import { Button, Dialog, DialogActions } from '@/components/common'
import { PageHeader, pageContainer } from '@/components/layout'
import { cn } from '@/utils/cn'

/** Add a person (/settings/allergies/new) or edit one (/settings/allergies/:id). */
export function AllergyProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const profiles = useAllergyStore((s) => s.profiles)
  const addProfile = useAllergyStore((s) => s.addProfile)
  const updateProfile = useAllergyStore((s) => s.updateProfile)
  const deleteProfile = useAllergyStore((s) => s.deleteProfile)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const existing = id && id !== 'new' ? profiles.find((p) => p.id === id) : undefined
  if (id && id !== 'new' && !existing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Person not found" onBack={() => navigate('/settings/allergies')} />
        <div className={cn(pageContainer('narrow'), 'py-4 md:py-6')}>
          <Button onClick={() => navigate('/settings/allergies')}>Back to Allergies</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={existing ? existing.name : 'New person'} onBack={() => navigate('/settings/allergies')} />
      <div className={cn(pageContainer('narrow'), 'py-4 pb-12 md:py-6')}>
        <AllergyProfileEditor
          key={existing?.id ?? 'new'}
          initial={existing}
          existingCount={profiles.length}
          onCancel={() => navigate('/settings/allergies')}
          onSave={(input) => {
            if (existing) updateProfile(existing.id, input)
            else addProfile(input)
            navigate('/settings/allergies')
          }}
          onDelete={existing ? () => setConfirmDelete(true) : undefined}
        />
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${existing?.name ?? 'this person'}?`}
        description="Their allergies are removed for the whole household."
      >
        <DialogActions>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (existing) deleteProfile(existing.id)
              navigate('/settings/allergies')
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
