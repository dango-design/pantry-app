import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, ChefHat, Loader2, Plus, ThumbsDown, ThumbsUp } from 'lucide-react'
import { lookupProduct } from '@/allergy/lookup'
import { productName } from '@/allergy/products'
import { useAllergyStore, useRecordsForGtin, useSelectedProfiles } from '@/allergy/store'
import { verdictFor } from '@/allergy/verdict'
import type { SavedList } from '@/allergy/types'
import { AllergyResult, PersonChips } from '@/components/allergy'
import { Button, Card, CardContent } from '@/components/common'
import { BarcodeScanner } from '@/components/smart-input'
import { cn } from '@/utils/cn'
import { PageHeader, pageContainer } from '@/components/layout'

/** Check a product by barcode and see a verdict for each selected person. */
export function CheckPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { profiles, selected, selectedIds } = useSelectedProfiles()
  const setSelectedProfileIds = useAllergyStore((s) => s.setSelectedProfileIds)
  const saved = useAllergyStore((s) => s.saved)
  const scans = useAllergyStore((s) => s.scans)
  const saveProduct = useAllergyStore((s) => s.saveProduct)
  const removeSaved = useAllergyStore((s) => s.removeSaved)
  const addScan = useAllergyStore((s) => s.addScan)

  const [code, setCode] = useState(params.get('gtin') ?? '')
  const [gtin, setGtin] = useState<string | null>(null)
  const [storeMade, setStoreMade] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceErrors, setSourceErrors] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)

  const records = useRecordsForGtin(gtin)
  const result = useMemo(() => (gtin ? verdictFor(gtin, records, selected) : null), [gtin, records, selected])
  const { name, brand } = productName(records)
  const savedEntry = saved.find((s) => s.gtin === gtin)

  const check = useCallback(
    async (raw: string, format?: string) => {
      if (!raw.trim()) return
      setLoading(true)
      setError(null)
      try {
        const r = await lookupProduct(raw, { symbology: format })
        setGtin(r.gtin)
        setCode(r.gtin)
        setStoreMade(r.storeMade)
        setSourceErrors(r.sourceErrors)
        setParams({ gtin: r.gtin }, { replace: true })
        const found = productName(r.records)
        const people = useAllergyStore.getState().profiles
        addScan({
          gtin: r.gtin,
          overall: verdictFor(r.gtin, r.records, people).overall,
          name: r.records.length > 0 ? found.name : null,
          brand: found.brand,
        })
      } catch (e) {
        setGtin(null)
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [addScan, setParams],
  )

  // A link such as /check?gtin=00044000037451 checks that product straight away, once. check changes
  // whenever the URL does, so the starting barcode is cleared after its first use.
  const initial = useRef(params.get('gtin'))
  useEffect(() => {
    const first = initial.current
    initial.current = null
    if (first) void check(first)
  }, [check])

  const toggleSaved = (list: SavedList) => {
    if (!gtin) return
    if (savedEntry?.list === list) removeSaved(gtin)
    else saveProduct({ gtin, list, name: records.length > 0 ? name : null, brand })
  }

  if (scanning) {
    return (
      <BarcodeScanner
        title="Check a product"
        onCode={(c, format) => {
          setScanning(false)
          void check(c, format)
        }}
        onCancel={() => setScanning(false)}
      />
    )
  }

  const recent = scans.filter((s) => s.gtin !== gtin).slice(0, 8)
  const notFound = gtin && !storeMade && records.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Check a product"
        hideBackOnDesktop
        actions={
          <Link
            to="/chef-card"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
          >
            <ChefHat aria-hidden className="h-4 w-4" />
            Chef card
          </Link>
        }
      />

      <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6')}>
        {profiles.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-gray-700">
              Add the people you check food for, and their allergies.{' '}
              <Link to="/settings/allergies" className="font-medium text-primary underline">
                Settings, then Allergies
              </Link>
            </CardContent>
          </Card>
        ) : (
          <PersonChips
            profiles={profiles}
            selectedIds={selectedIds}
            onChange={(ids) => setSelectedProfileIds(ids.length === profiles.length ? null : ids)}
          />
        )}

        <Card>
          <CardContent className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void check(code)
              }}
            >
              <label htmlFor="check-barcode" className="sr-only">
                Barcode number
              </label>
              <input
                id="check-barcode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Barcode number"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base tracking-wider focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button type="submit" loading={loading} disabled={!code.trim()} className="px-5">
                Check
              </Button>
            </form>
            <Button variant="secondary" className="w-full" onClick={() => setScanning(true)}>
              <Camera aria-hidden className="mr-2 h-5 w-5" />
              Scan with camera
            </Button>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          </CardContent>
        </Card>

        {loading && !result && (
          <div className="flex justify-center py-6 text-gray-500">
            <Loader2 aria-label="Checking" className="h-6 w-6 animate-spin" />
          </div>
        )}

        {result && gtin && (
          <>
            {notFound && (
              <p className="text-sm text-gray-700">
                {sourceErrors.length > 0
                  ? `Could not reach Open Food Facts: ${sourceErrors[0]}`
                  : 'Open Food Facts does not know this barcode.'}
              </p>
            )}
            <AllergyResult
              result={result}
              title={records.length > 0 ? name : storeMade ? 'Store-made item' : `Barcode ${gtin}`}
              brand={brand}
              profiles={selected}
              fetchedAt={records.map((r) => r.fetchedAt).sort().pop()}
              emptyPeopleMessage={
                profiles.length === 0 ? (
                  <>
                    Nobody to check for yet.{' '}
                    <Link to="/settings/allergies" className="font-medium text-primary underline">
                      Add people and their allergies
                    </Link>
                    .
                  </>
                ) : (
                  'Choose who you are checking for above.'
                )
              }
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button onClick={() => navigate('/add', { state: { gtin } })}>
                <Plus aria-hidden className="mr-1.5 h-4 w-4" />
                Add to pantry
              </Button>
              <Button
                variant="secondary"
                aria-pressed={savedEntry?.list === 'safe'}
                onClick={() => toggleSaved('safe')}
                className={cn(savedEntry?.list === 'safe' && 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200')}
              >
                <ThumbsUp aria-hidden className="mr-1.5 h-4 w-4" />
                {savedEntry?.list === 'safe' ? 'Saved as safe' : 'Save as safe'}
              </Button>
              <Button
                variant="secondary"
                aria-pressed={savedEntry?.list === 'avoid'}
                onClick={() => toggleSaved('avoid')}
                className={cn(savedEntry?.list === 'avoid' && 'bg-red-100 text-red-900 hover:bg-red-200')}
              >
                <ThumbsDown aria-hidden className="mr-1.5 h-4 w-4" />
                {savedEntry?.list === 'avoid' ? 'Saved as avoid' : 'Save as avoid'}
              </Button>
            </div>
          </>
        )}

        {saved.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Saved</h2>
            <Card>
              <ul className="divide-y divide-gray-100">
                {saved.map((s) => (
                  <li key={s.gtin}>
                    <button
                      type="button"
                      onClick={() => void check(s.gtin)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900">{s.name ?? `Barcode ${s.gtin}`}</span>
                        {s.brand && <span className="block truncate text-sm text-gray-500">{s.brand}</span>}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                          s.list === 'safe' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800',
                        )}
                      >
                        {s.list === 'safe' ? <ThumbsUp aria-hidden className="h-3 w-3" /> : <ThumbsDown aria-hidden className="h-3 w-3" />}
                        {s.list === 'safe' ? 'Safe' : 'Avoid'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Recent checks</h2>
            <Card>
              <ul className="divide-y divide-gray-100">
                {recent.map((s) => (
                  <li key={s.gtin}>
                    <button
                      type="button"
                      onClick={() => void check(s.gtin)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900">{s.name ?? `Barcode ${s.gtin}`}</span>
                        {s.brand && <span className="block truncate text-sm text-gray-500">{s.brand}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-gray-500">Check again</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
