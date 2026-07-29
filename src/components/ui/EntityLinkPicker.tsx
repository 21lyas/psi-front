import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Link2, Loader2 } from 'lucide-react'

export interface LinkOption {
  value: string
  label: string
  sublabel?: string | null
  disabled?: boolean
}

interface EntityLinkPickerProps {
  queryKey: string
  value: string | null | undefined
  valueLabel?: string | null
  placeholder: string
  fetchOptions: (search: string) => Promise<LinkOption[]>
  onChange: (value: string | null, option?: LinkOption) => void
}

// Searchable "link this record to an external system" combobox — used to attach
// a psi employee to their ServiceTitan / Gusto identity from a live directory lookup.
export default function EntityLinkPicker({ queryKey, value, valueLabel, placeholder, fetchOptions, onChange }: EntityLinkPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const { data: options = [], isFetching } = useQuery({
    queryKey: [queryKey, search],
    queryFn: () => fetchOptions(search),
    enabled: open,
    staleTime: 30_000,
  })

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
        <Link2 size={13} className="text-emerald-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{valueLabel || `#${value}`}</p>
          <p className="text-xs text-gray-400 font-mono">{value}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input-field pl-8 text-xs"
          placeholder={placeholder}
          value={search}
          onFocus={() => setOpen(true)}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
        />
        {isFetching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 animate-spin" />}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {options.length === 0 && !isFetching && (
            <p className="px-3 py-2 text-xs text-gray-400">{search ? 'No matches' : 'Start typing to search…'}</p>
          )}
          {options.map(opt => (
            <button
              type="button"
              key={opt.value}
              disabled={opt.disabled}
              onClick={() => { onChange(opt.value, opt); setOpen(false); setSearch('') }}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed border-b border-gray-50 last:border-0"
            >
              <p className="text-sm text-gray-900 truncate">{opt.label}</p>
              {opt.sublabel && <p className="text-xs text-gray-400 truncate">{opt.sublabel}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
