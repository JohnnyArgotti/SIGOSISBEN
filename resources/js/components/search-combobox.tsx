import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

/** Caracteres mínimos por defecto antes de consultar al servidor (igual que el backend) */
const MIN_CARACTERES = 3

/** Espera tras la última tecla antes de consultar */
const ESPERA_MS = 250

export type SearchOption = { value: string; label: string }

type Props = {
    /** URL que responde { opciones: SearchOption[], hayMas: boolean }; se le agrega ?q= */
    url: string
    /** Valor seleccionado ('' = ninguno) */
    value: string
    /** Texto visible del valor seleccionado */
    label: string
    onChange: (value: string, label: string) => void
    placeholder?: string
    /** Caracteres a escribir antes de buscar (debe coincidir con el backend) */
    minCaracteres?: number
}

/**
 * SearchCombobox
 *
 * Input de búsqueda con desplegable de coincidencias (mismo patrón que
 * BarrioCombobox pero genérico y sin opción de crear). Las opciones se piden
 * al servidor mientras se escribe: los catálogos que usa (radicados,
 * solicitantes) crecen con cada solicitud y no caben en la página.
 *
 * Operable por teclado: flechas para recorrer las coincidencias, Enter para
 * elegir la resaltada, Escape para cerrar, Inicio/Fin para ir a los extremos.
 * El foco nunca sale del input; la opción activa se comunica al lector de
 * pantalla con aria-activedescendant (patrón combobox de ARIA).
 */
export default function SearchCombobox({
    url,
    value,
    label,
    onChange,
    placeholder,
    minCaracteres = MIN_CARACTERES,
}: Props) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [options, setOptions] = useState<SearchOption[]>([])
    const [hayMas, setHayMas] = useState(false)
    const [buscando, setBuscando] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const listboxId = useId()

    // Sincronizar el texto visible con el valor seleccionado
    useEffect(() => {
        setQuery(label)
    }, [label])

    // Cerrar el dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setActiveIndex(-1)
                setQuery(label)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [label])

    const trimmed = query.trim()
    // Con el valor ya elegido a la vista no hay nada que buscar
    const debeBuscar = open && trimmed.length >= minCaracteres && trimmed !== label

    // Consultar al servidor tras una pausa; una respuesta vieja nunca pisa a una nueva
    useEffect(() => {
        if (!debeBuscar) {
            setOptions([])
            setHayMas(false)
            setBuscando(false)
            return
        }
        const controller = new AbortController()
        setBuscando(true)
        const timer = setTimeout(async () => {
            try {
                const sep = url.includes('?') ? '&' : '?'
                const res = await fetch(`${url}${sep}q=${encodeURIComponent(trimmed)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                })
                const payload: { opciones: SearchOption[]; hayMas: boolean } = res.ok
                    ? await res.json()
                    : { opciones: [], hayMas: false }
                setOptions(payload.opciones)
                setHayMas(payload.hayMas)
                setActiveIndex(-1)
            } catch {
                if (controller.signal.aborted) return
                setOptions([])
                setHayMas(false)
            }
            setBuscando(false)
        }, ESPERA_MS)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [debeBuscar, trimmed, url])

    const visible = debeBuscar && !buscando ? options : []

    // Mantener a la vista la opcion que se recorre con las flechas
    useEffect(() => {
        if (activeIndex < 0) return
        listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value)
        setOpen(true)
        // La lista se rehace con cada tecla: la opcion resaltada deja de ser valida
        setActiveIndex(-1)
        if (e.target.value === '' && value !== '') onChange('', '')
    }

    function handleSelect(option: SearchOption) {
        setQuery(option.label)
        setOpen(false)
        setActiveIndex(-1)
        onChange(option.value, option.label)
    }

    function handleClear() {
        setQuery('')
        setOpen(false)
        setActiveIndex(-1)
        onChange('', '')
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) {
                setOpen(true)
                return
            }
            if (visible.length === 0) return
            const delta = e.key === 'ArrowDown' ? 1 : -1
            setActiveIndex(i => (i + delta + visible.length) % visible.length)
            return
        }

        if (e.key === 'Home' || e.key === 'End') {
            if (!open || visible.length === 0) return
            e.preventDefault()
            setActiveIndex(e.key === 'Home' ? 0 : visible.length - 1)
            return
        }

        if (e.key === 'Enter') {
            // Solo se intercepta Enter si hay una opcion resaltada; de lo
            // contrario el formulario se envia como siempre.
            if (open && activeIndex >= 0 && visible[activeIndex] !== undefined) {
                e.preventDefault()
                handleSelect(visible[activeIndex])
            }
            return
        }

        if (e.key === 'Escape') {
            if (!open) return
            e.preventDefault()
            setOpen(false)
            setActiveIndex(-1)
            setQuery(label)
            return
        }

        if (e.key === 'Tab') {
            setOpen(false)
            setActiveIndex(-1)
        }
    }

    let aviso: string | null = null
    if (trimmed === label && label !== '') aviso = null
    else if (trimmed.length < minCaracteres) {
        aviso = minCaracteres === 1
            ? 'Escriba para buscar.'
            : `Escriba al menos ${minCaracteres} caracteres para buscar.`
    }
    else if (buscando) aviso = 'Buscando…'
    else if (visible.length === 0) aviso = 'Sin coincidencias.'

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={open ? listboxId : undefined}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
                    }
                    placeholder={placeholder ?? 'Buscar...'}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    className="pr-8"
                />
                {query.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground text-base leading-none"
                        aria-label="Limpiar"
                    >
                        ×
                    </button>
                )}
            </div>

            {open && (aviso !== null || visible.length > 0) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg max-h-56 overflow-y-auto text-sm">
                    {visible.length > 0 ? (
                        <ul ref={listRef} id={listboxId} role="listbox">
                            {visible.map((option, i) => (
                                <li
                                    key={option.value}
                                    id={`${listboxId}-opt-${i}`}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    // preventDefault evita que el input pierda el foco antes del click
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => handleSelect(option)}
                                    className={`cursor-pointer px-3 py-2 select-none ${
                                        i === activeIndex ? 'bg-muted' : 'hover:bg-muted'
                                    }`}
                                >
                                    {option.label}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-3 py-2 text-muted-foreground italic" role="status">{aviso}</p>
                    )}
                    {hayMas && visible.length > 0 && (
                        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                            Mostrando las primeras {visible.length} coincidencias — siga escribiendo para refinar.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
