import { useAppStore } from '../store/useAppStore'

export function SearchBar(): JSX.Element {
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)

  return (
    <label className="search-bar">
      <input
        type="search"
        className="search-bar__input"
        placeholder="Search by name or description"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  )
}
