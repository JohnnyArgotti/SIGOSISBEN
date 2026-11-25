import { useState, useRef, useEffect, useId } from 'react'
import { Input } from '@/components/ui/input'
import InputError from '@/components/input-error'

type Barrio = {
    id: number
    nombre: string
    comuna_id: number
}

/** Entradas del desplegable: barrios existentes y, al final, la opcion de crear uno nuevo. */
type Item =
    | { kind: 'barrio'; barrio: Barrio }
    | { kind: 'crear' }

type Props = {
    barrios: Barrio[]
    comunaId: string | number
    value: number | ''
    newValue: string
    onSelect: (id: number | '', nombre: string) => void
    error?: string
    disabled?: boolean
}

/**
 * BarrioCombobox
 *
 * Muestra un input de búsqueda/creación para barrios:
 * - Si el usuario escribe y hay coincidencias, las muestra en un desplegable.
 * - Si no hay coincidencias, ofrece la opción "Crear barrio '<nombre>'" para
 *   registrar uno nuevo al guardar el formulario.
 * - Cuando se selecciona un barrio existente, devuelve su id (onSelect(id, '')).
 * - Cuando se decide crear uno nuevo, devuelve id='' y nombre=texto (onSelect('', texto)).
 *
 * Operable por teclado: flechas para recorrer el desplegable (la opción de
 * crear es una entrada más de la lista), Enter para elegir la resaltada,
 * Escape para cerrar. El foco permanece en el input y la opción activa se
 * comunica con aria-activedescendant (patrón combobox de ARIA).
 */
export default function BarrioCombobox({
    barrios,
    comunaId,
    value,
    newValue,
    onSelect,
    error,
    disabled = false,
}: Props) {
    const [query, setQuery] = useState<string>('')
    const [open, setOpen] = useState(false)
    const [pendingNew, setPendingNew] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const listboxId = useId()
    // El componente puede aparecer varias veces en una pagina, asi que el id del
    // mensaje de error debe ser unico por instancia (WCAG 3.3.1).
    const errorId = `${listboxId}-error`

    // Sincronizar el texto visible cuando hay un valor seleccionado o uno nuevo
    useEffect(() => {
        if (value !== '') {
            const found = barrios.find(b => b.id === value)
            setQuery(found ? found.nombre : '')
            setPendingNew(false)
        } else if (newValue) {
            setQuery(newValue)
            setPendingNew(true)
        } else {
            setQuery('')
            setPendingNew(false)
        }
    }, [value, newValue, barrios])

    // Cerrar el dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setActiveIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredBarrios = barrios
        .filter(b =>
            query.trim().length > 0
                ? b.nombre.toLowerCase().includes(query.toLowerCase())
                : true
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

    const exactMatch = barrios.some(
        b => b.nombre.toLowerCase() === query.trim().toLowerCase()
    )

    const showCreateOption =
        !disabled &&
        comunaId !== '' &&
        query.trim().length > 0 &&
        !exactMatch

    // Lista unica que recorren las flechas: barrios y, si aplica, "crear barrio".
    const items: Item[] = [
        ...filteredBarrios.map(b => ({ kind: 'barrio' as const, barrio: b })),
        ...(showCreateOption ? [{ kind: 'crear' as const }] : []),
    ]

    // Mantener a la vista la opcion que se recorre con las flechas
    useEffect(() => {
        if (activeIndex < 0) return
        listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value.toUpperCase()
        setQuery(val)
        setPendingNew(false)
        // La lista se rehace con cada tecla: la opcion resaltada deja de ser valida
        setActiveIndex(-1)
        onSelect('', val) // limpiar id seleccionado, guardar texto provisional
        setOpen(true)
    }

    function handleSelectExisting(barrio: Barrio) {
        setQuery(barrio.nombre)
        setPendingNew(false)
        setOpen(false)
        setActiveIndex(-1)
        onSelect(barrio.id, '')
    }

    function handleCreateNew() {
        const nombre = query.trim()
        if (!nombre) return
        setPendingNew(true)
        setOpen(false)
        setActiveIndex(-1)
        onSelect('', nombre)
    }

    function handleSelectItem(item: Item) {
        if (item.kind === 'crear') handleCreateNew()
        else handleSelectExisting(item.barrio)
    }

    function handleClear() {
        setQuery('')
        setPendingNew(false)
        setOpen(false)
        setActiveIndex(-1)
        onSelect('', '')
        inputRef.current?.focus()
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (disabled) return

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) {
                setOpen(true)
                setActiveIndex(e.key === 'ArrowDown' ? 0 : items.length - 1)
                return
            }
            if (items.length === 0) return
            const delta = e.key === 'ArrowDown' ? 1 : -1
            setActiveIndex(i => (i + delta + items.length) % items.length)
            return
        }

        if (e.key === 'Home' || e.key === 'End') {
            if (!open || items.length === 0) return
            e.preventDefault()
            setActiveIndex(e.key === 'Home' ? 0 : items.length - 1)
            return
        }

        if (e.key === 'Enter') {
            // Solo se intercepta Enter si hay una opcion resaltada; de lo
            // contrario el formulario se envia como siempre.
            if (open && activeIndex >= 0 && items[activeIndex] !== undefined) {
                e.preventDefault()
                handleSelectItem(items[activeIndex])
            }
            return
        }

        if (e.key === 'Escape') {
            if (!open) return
            e.preventDefault()
            setOpen(false)
            setActiveIndex(-1)
            return
        }

        if (e.key === 'Tab') {
            setOpen(false)
            setActiveIndex(-1)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    ref={inputRef}
                    role="combobox"
                    aria-expanded={open && !disabled}
                    aria-controls={open && !disabled ? listboxId : undefined}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        open && !disabled && activeIndex >= 0
                            ? `${listboxId}-opt-${activeIndex}`
                            : undefined
                    }
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    placeholder={
                        disabled
                            ? 'Seleccione primero una comuna'
                            : 'Buscar o crear barrio...'
                    }
                    value={query}
                    disabled={disabled}
                    onChange={handleInputChange}
                    onFocus={() => !disabled && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    className={[
                        'pr-8',
                        pendingNew
                            ? 'border-blue-400 ring-1 ring-blue-300'
                            : '',
                        error
                            ? 'border-red-500'
                            : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                />
                {query.length > 0 && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-gray-600 hover:text-gray-700 text-base leading-none"
                        aria-label="Limpiar barrio"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Badge de "barrio nuevo" */}
            {pendingNew && (
                <p className="mt-1 text-xs text-blue-600 font-medium">
                    ✦ Se creará el barrio &quot;{query}&quot; al guardar.
                </p>
            )}

            <InputError id={errorId} message={error} />

            {/* Dropdown */}
            {open && !disabled && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto text-sm">
                    {items.length > 0 && (
                        <ul ref={listRef} id={listboxId} role="listbox">
                            {items.map((item, i) =>
                                item.kind === 'barrio' ? (
                                    <li
                                        key={item.barrio.id}
                                        id={`${listboxId}-opt-${i}`}
                                        role="option"
                                        aria-selected={i === activeIndex}
                                        // preventDefault evita que el input pierda el foco antes del click
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => handleSelectItem(item)}
                                        className={`cursor-pointer px-3 py-2 select-none ${
                                            i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {item.barrio.nombre}
                                    </li>
                                ) : (
                                    <li
                                        key="crear"
                                        id={`${listboxId}-opt-${i}`}
                                        role="option"
                                        aria-selected={i === activeIndex}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => handleSelectItem(item)}
                                        className={`cursor-pointer border-t border-gray-100 px-3 py-2 text-blue-600 font-medium select-none flex items-center gap-2 ${
                                            i === activeIndex ? 'bg-blue-50' : 'hover:bg-blue-50'
                                        }`}
                                    >
                                        <span className="text-base leading-none">+</span>
                                        Crear barrio &quot;{query.trim()}&quot;
                                    </li>
                                )
                            )}
                        </ul>
                    )}

                    {items.length === 0 && query.trim().length === 0 && (
                        <p className="px-3 py-2 text-gray-600 italic">
                            Empiece a escribir para buscar...
                        </p>
                    )}

                    {items.length === 0 && query.trim().length > 0 && (
                        <p className="px-3 py-2 text-gray-600 italic">Sin coincidencias.</p>
                    )}
                </div>
            )}
        </div>
    )
}
