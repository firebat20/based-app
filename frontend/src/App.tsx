import { Button } from "@/components/ui/button"
import * as React from "react"
import { Pbar } from "./Pbar"
import { LoadSettings, UpdateLocalLibrary, SaveSettings, GetMissingUpdates, GetMissingDLC } from "../wailsjs/go/main/App"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function Topmenu() {
  type Theme = "dark" | "light" | "system"

  const [theme, setThemeState] = React.useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "system"
  )

  React.useEffect(() => {
    const root = document.documentElement
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)

    root.classList.toggle("dark", isDark)

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches)
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem("theme", newTheme)
    setThemeState(newTheme)
  }

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Open... <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>Settings</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Exit</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Debug</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Reload UI <MenubarShortcut>F5</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Open DevTools <MenubarShortcut>F12</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Theme</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={() => setTheme("light")}>Light</MenubarItem>
          <MenubarItem onClick={() => setTheme("dark")}>Dark</MenubarItem>
          <MenubarItem onClick={() => setTheme("system")}>System</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

export function Tabsmenu() {
//  const [mainCount1, setMainCount1] = React.useState(0)
  const [mainCount2, setMainCount2] = React.useState(0)
  const [settings, setSettings] = React.useState("")
  const [editMode, setEditMode] = React.useState(false)
  const [modifiedSettings, setModifiedSettings] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState("")
  const [issues, setIssues] = React.useState<{ key: string; value: string }[]>([])
  const [issuesLoading, setIssuesLoading] = React.useState(false)
  const [libraryData, setLibraryData] = React.useState<any[]>([])
  const [libraryLoading, setLibraryLoading] = React.useState(false)
  const [missingUpdates, setMissingUpdates] = React.useState<any[]>([])
  const [missingLoading, setMissingLoading] = React.useState(false)
  const [filterMissing, setFilterMissing] = React.useState("")
  const [sortMissingKey, setSortMissingKey] = React.useState<string | null>(null)
  const [sortMissingDir, setSortMissingDir] = React.useState<"asc" | "desc">("asc")
  const [missingDLC, setMissingDLC] = React.useState<any[]>([])
  const [missingDLCLoading, setMissingDLCLoading] = React.useState(false)
  const [filterDLC, setFilterDLC] = React.useState("")
// const [sortDLCKey, setSortDLCKey] = React.useState<string | null>(null)
//  const [sortDLCDir, setSortDLCDir] = React.useState<"asc" | "desc">("asc")
  const [filterTitle, setFilterTitle] = React.useState("")
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  const settingsPreRef = React.useRef<HTMLPreElement | null>(null)
  const [settingsDisplayHeight, setSettingsDisplayHeight] = React.useState<number | null>(null)
  const [textareaHeight, setTextareaHeight] = React.useState<string | undefined>(undefined)

  async function handleLoadSettings() {
    try {
      const settingsJson = await LoadSettings()
      // Prettify the JSON for display
      const formattedSettings = JSON.stringify(JSON.parse(settingsJson), null, 2)
      setSettings(formattedSettings)
      setModifiedSettings(formattedSettings)
      setEditMode(false)
    } catch (err) {
      console.error(err)
      setSettings("Error: Could not load settings.")
    }
  }

  async function handleSaveSettings() {
    setSaveStatus("")
    // validate JSON before sending
    try {
      setSaving(true)
      const parsed = JSON.parse(modifiedSettings)
      const pretty = JSON.stringify(parsed)
      // call backend SaveSettings which accepts a JSON string
      await SaveSettings(pretty)
      // update UI with prettified, indented JSON
      const formatted = JSON.stringify(parsed, null, 2)
      setSettings(formatted)
      setModifiedSettings(formatted)
      setEditMode(false)
      setSaveStatus("Saved successfully")
    } catch (err) {
      console.error(err)
      setSaveStatus("Error: Invalid JSON or save failed")
    } finally {
      setSaving(false)
      // clear status after a short time
      setTimeout(() => setSaveStatus(""), 3000)
    }
  }

  async function handleLoadIssues() {
    setIssuesLoading(true)
    try {
      const res = await UpdateLocalLibrary(false)
      // The backend may return either a JSON string or an already-parsed object depending on runtime.
      if (!res) {
        console.debug("UpdateLocalLibrary returned empty result")
        setIssues([])
        return
      }
      let parsed: any = res
      if (typeof res === "string") {
        try {
          parsed = JSON.parse(res)
        } catch (e) {
          console.error("Failed to parse UpdateLocalLibrary JSON:", e, res)
          setIssues([])
          return
        }
      }

      // UpdateLocalLibrary response has shape { issues: [{key,value}, ...], ... }
      const iss = parsed.issues || parsed.Issues || []
      // Normalize entries to objects with lowercase keys so UI can use .key and .value
      const normalized = iss.map((it: any) => ({ key: it.key ?? it.Key ?? "", value: it.value ?? it.Value ?? "" }))
      console.debug("Loaded issues:", normalized.length, normalized.slice(0, 5))
      setIssues(normalized)
    } catch (err) {
      console.error(err)
      setIssues([])
    } finally {
      setIssuesLoading(false)
    }
  }

  async function handleLoadLibrary() {
    setLibraryLoading(true)
    try {
      const res = await UpdateLocalLibrary(false)
      if (!res) {
        setLibraryData([])
        return
      }
      let parsed: any = res
      if (typeof res === "string") {
        try {
          parsed = JSON.parse(res)
        } catch (e) {
          console.error("Failed to parse UpdateLocalLibrary JSON:", e, res)
          setLibraryData([])
          return
        }
      }

      // response.LibraryData = libraryData
      const lib = parsed.library_data || parsed.LibraryData || parsed.libraryData || []
      // Normalize fields
      const normalized = lib.map((it: any) => ({
        id: it.id ?? it.Id ?? null,
        name: it.name ?? it.Name ?? "",
        version: it.version ?? it.Version ?? "",
        dlc: it.dlc ?? it.Dlc ?? "",
        titleId: it.titleId ?? it.TitleId ?? it.TitleID ?? "",
        path: it.path ?? it.Path ?? "",
        icon: it.icon ?? it.Icon ?? "",
        update: it.update ?? it.Update ?? 0,
        region: it.region ?? it.Region ?? "",
        type: it.type ?? it.Type ?? "",
      }))
      setLibraryData(normalized)
    } catch (err) {
      console.error(err)
      setLibraryData([])
    } finally {
      setLibraryLoading(false)
    }
  }

  async function handleLoadMissingUpdates() {
    setMissingLoading(true)
    try {
      const res = await GetMissingUpdates()
      if (!res) {
        setMissingUpdates([])
        return
      }
      let parsed: any = res
      if (typeof res === "string") {
        try {
          parsed = JSON.parse(res)
        } catch (e) {
          console.error("Failed to parse GetMissingUpdates JSON:", e, res)
          setMissingUpdates([])
          return
        }
      }

      // parsed is a map/object keyed by titleId or an array; normalize to array
      let arr: any[] = []
      if (Array.isArray(parsed)) {
        arr = parsed
      } else {
        // object map -> values
        arr = Object.values(parsed)
      }

      const normalized = arr.map((it: any) => ({
        name: it.Attributes?.name ?? it.Attributes?.Name ?? it.name ?? it.Name ?? "",
        titleId: it.Attributes?.id ?? it.Attributes?.Id ?? it.Attributes?.Id ?? it.titleId ?? it.TitleId ?? it.Attributes?.Id ?? "",
        icon: it.Attributes?.iconUrl ?? it.Attributes?.bannerUrl ?? it.Attributes?.IconUrl ?? it.icon ?? it.Icon ?? "",
        region: it.Attributes?.region ?? it.Attributes?.Region ?? "",
        latest_update: it.latest_update ?? it.LatestUpdate ?? it.LatestUpdate ?? it.LatestUpdate ?? it.LatestUpdate ?? it.LatestUpdate ?? 0,
        local_update: it.local_update ?? it.LocalUpdate ?? it.LocalUpdate ?? 0,
        latest_update_date: it.latest_update_date ?? it.LatestUpdateDate ?? it.LatestUpdateDate ?? "",
        missing_dlc: it.missing_dlc ?? it.MissingDLC ?? it.MissingDlc ?? [],
      }))
      setMissingUpdates(normalized)
    } catch (err) {
      console.error(err)
      setMissingUpdates([])
    } finally {
      setMissingLoading(false)
    }
  }

  async function handleLoadMissingDLC() {
    setMissingDLCLoading(true)
    try {
      const res = await GetMissingDLC()
      if (!res) {
        setMissingDLC([])
        return
      }
      let parsed: any = res
      if (typeof res === "string") {
        try {
          parsed = JSON.parse(res)
        } catch (e) {
          console.error("Failed to parse GetMissingDLC JSON:", e, res)
          setMissingDLC([])
          return
        }
      }

      let arr: any[] = []
      if (Array.isArray(parsed)) {
        arr = parsed
      } else {
        arr = Object.values(parsed)
      }

      const normalized = arr.map((it: any) => ({
        name: it.Attributes?.name ?? it.Attributes?.Name ?? it.name ?? it.Name ?? "",
        titleId: it.Attributes?.id ?? it.Attributes?.Id ?? it.titleId ?? it.TitleId ?? "",
        icon: it.Attributes?.iconUrl ?? it.Attributes?.bannerUrl ?? it.Attributes?.IconUrl ?? it.icon ?? it.Icon ?? "",
        region: it.Attributes?.region ?? it.Attributes?.Region ?? "",
        missing_dlc: it.missing_dlc ?? it.MissingDLC ?? it.MissingDlc ?? it.MissingDLC ?? it.MissingDlc ?? it.MissingDLC ?? [],
      }))
      setMissingDLC(normalized)
    } catch (err) {
      console.error(err)
      setMissingDLC([])
    } finally {
      setMissingDLCLoading(false)
    }
  }

  // update measured display height when settings text is set
  React.useEffect(() => {
    if (settingsPreRef.current) {
      // clientHeight reflects the rendered height of the <pre>
      setSettingsDisplayHeight(settingsPreRef.current.clientHeight)
    } else {
      setSettingsDisplayHeight(null)
    }
  }, [settings])

  // when entering edit mode, set textarea height to match the display height (with a sensible max)
  React.useEffect(() => {
    if (editMode && settingsDisplayHeight) {
      const max = 800 // pixels - avoid extremely tall textareas
      const height = Math.min(settingsDisplayHeight, max)
      setTextareaHeight(`${height}px`)
    } else {
      setTextareaHeight(undefined)
    }
  }, [editMode, settingsDisplayHeight])

  return (
    <div className="flex w-full flex-col gap-6">
      <Tabs
        defaultValue="library"
        onValueChange={(value) => {
          if (value === "settings") {
            handleLoadSettings()
          }
              if (value === "issues") {
            handleLoadIssues()
          }
              if (value === "mupdate") {
                handleLoadMissingUpdates()
              }
              if (value === "mdlc") {
                handleLoadMissingDLC()
              }
        }}>
        <TabsList className="flex w-full">
          <TabsTrigger className="flex-1" value="library">LIBRARY</TabsTrigger>
          <TabsTrigger className="flex-1" value="mupdate">MISSING UPDATE</TabsTrigger>
          <TabsTrigger className="flex-1" value="mdlc">MISSING DLC</TabsTrigger>
          <TabsTrigger className="flex-1" value="organize">ORGANIZE</TabsTrigger>
          <TabsTrigger className="flex-1" value="issues">ISSUES</TabsTrigger>
          <TabsTrigger className="flex-1" value="settings">SETTINGS</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleLoadLibrary}>Refresh Library</Button>
              {libraryLoading && <span className="text-sm">Loading...</span>}
              {!libraryLoading && <span className="text-sm">{libraryData.length} item{libraryData.length === 1 ? "" : "s"} (showing <strong>{libraryData.filter(d => d.name.toLowerCase().includes(filterTitle.toLowerCase())).length}</strong>)</span>}
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 w-[5ch]">#</th>
                    <th className="text-left p-2 w-[15ch]">Icon</th>
                    <th className="text-left p-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>Title</span>
                          <button className="text-xs opacity-60" onClick={() => { setSortKey('name'); setSortDir(sortKey === 'name' && sortDir === 'asc' ? 'desc' : 'asc') }}>{sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '▴▾'}</button>
                        </div>
                        <input value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} placeholder="filter column..." className="mt-1 w-full rounded border p-1 text-sm" />
                      </div>
                    </th>
                    <th className="text-left p-2"><div className="flex items-center gap-2">Title id <button className="text-xs opacity-60" onClick={() => { setSortKey('titleId'); setSortDir(sortKey === 'titleId' && sortDir === 'asc' ? 'desc' : 'asc') }}>{sortKey === 'titleId' ? (sortDir === 'asc' ? '▲' : '▼') : '▴▾'}</button></div></th>
                    <th className="text-left p-2"><div className="flex items-center gap-2 w-[10ch]">Region <button className="text-xs opacity-60" onClick={() => { setSortKey('region'); setSortDir(sortKey === 'region' && sortDir === 'asc' ? 'desc' : 'asc') }}>{sortKey === 'region' ? (sortDir === 'asc' ? '▲' : '▼') : '▴▾'}</button></div></th>
                    <th className="text-left p-2"><div className="flex items-center gap-2 w-[10ch]">Type <button className="text-xs opacity-60" onClick={() => { setSortKey('type'); setSortDir(sortKey === 'type' && sortDir === 'asc' ? 'desc' : 'asc') }}>{sortKey === 'type' ? (sortDir === 'asc' ? '▲' : '▼') : '▴▾'}</button></div></th>
                    <th className="text-left p-2"><div className="flex items-center gap-2">Update <button className="text-xs opacity-60" onClick={() => { setSortKey('update'); setSortDir(sortKey === 'update' && sortDir === 'asc' ? 'desc' : 'asc') }}>{sortKey === 'update' ? (sortDir === 'asc' ? '▲' : '▼') : '▴▾'}</button></div></th>
                    <th className="text-left p-2">Version</th>
                    <th className="text-left p-2">File name</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryLoading ? (
                    <tr>
                      <td colSpan={9} className="p-2">Loading library...</td>
                    </tr>
                  ) : libraryData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-2">No library data</td>
                    </tr>
                  ) : (
                    // apply filter and sort before rendering
                    (() => {
                      const filtered = libraryData.filter(d => d.name.toLowerCase().includes(filterTitle.toLowerCase()))
                      const sorted = [...filtered]
                      if (sortKey) {
                        sorted.sort((a: any, b: any) => {
                          const va = a[sortKey] ?? ''
                          const vb = b[sortKey] ?? ''
                          // numeric compare for update
                          if (sortKey === 'update') {
                            const na = Number(va) || 0
                            const nb = Number(vb) || 0
                            return sortDir === 'asc' ? na - nb : nb - na
                          }
                          const sa = String(va).toLowerCase()
                          const sb = String(vb).toLowerCase()
                          if (sa < sb) return sortDir === 'asc' ? -1 : 1
                          if (sa > sb) return sortDir === 'asc' ? 1 : -1
                          return 0
                        })
                      }
                      return sorted.map((it, idx) => (
                        <tr key={idx} className="even:bg-muted/10">
                          <td className="p-2 align-top w-[5ch]">{idx + 1}</td>
                          <td className="p-2 align-top w-[15ch]">
                            {it.icon ? <img src={it.icon} alt="icon" className="h-20 w-20 object-contain" /> : null}
                          </td>
                          <td className="p-2 align-top break-words">{it.name}</td>
                          <td className="p-2 align-top">{it.titleId}</td>
                          <td className="p-2 align-top w-[10ch]">{it.region}</td>
                          <td className="p-2 align-top w-[10ch]">{it.type}</td>
                          <td className="p-2 align-top">{it.update}</td>
                          <td className="p-2 align-top">{it.version}</td>
                          <td className="p-2 align-top break-words">{it.path}</td>
                        </tr>
                      ))
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="mupdate">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleLoadMissingUpdates}>Refresh</Button>
              {missingLoading && <span className="text-sm">Loading...</span>}
              {!missingLoading && <span className="text-sm">{missingUpdates.length} item{missingUpdates.length === 1 ? "" : "s"}</span>}
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 w-[5ch]">#</th>
                    <th className="text-left p-2 w-[15ch]">Icon</th>
                    <th className="text-left p-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>Title</span>
                          <button className="text-xs opacity-60" onClick={() => { setSortMissingKey('name'); setSortMissingDir(sortMissingKey === 'name' && sortMissingDir === 'asc' ? 'desc' : 'asc') }}>{sortMissingKey === 'name' ? (sortMissingDir === 'asc' ? '▲' : '▼') : '▴▾'}</button>
                        </div>
                        <input value={filterMissing} onChange={(e) => setFilterMissing(e.target.value)} placeholder="filter column..." className="mt-1 w-full rounded border p-1 text-sm" />
                      </div>
                    </th>
                    <th className="text-left p-2">Title id</th>
                    <th className="text-left p-2 w-[10ch]">Region</th>
                    <th className="text-left p-2">Local</th>
                    <th className="text-left p-2">Latest</th>
                    <th className="text-left p-2">Latest date</th>
                    <th className="text-left p-2">Missing DLC</th>
                  </tr>
                </thead>
                <tbody>
                  {missingLoading ? (
                    <tr>
                      <td colSpan={9} className="p-2">Loading missing updates...</td>
                    </tr>
                  ) : missingUpdates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-2">No missing updates</td>
                    </tr>
                  ) : (
                    (() => {
                      const filtered = missingUpdates.filter(d => d.name.toLowerCase().includes(filterMissing.toLowerCase()))
                      const sorted = [...filtered]
                      if (sortMissingKey) {
                        sorted.sort((a: any, b: any) => {
                          const va = a[sortMissingKey] ?? ''
                          const vb = b[sortMissingKey] ?? ''
                          if (sortMissingKey === 'latest_update' || sortMissingKey === 'local_update') {
                            const na = Number(va) || 0
                            const nb = Number(vb) || 0
                            return sortMissingDir === 'asc' ? na - nb : nb - na
                          }
                          const sa = String(va).toLowerCase()
                          const sb = String(vb).toLowerCase()
                          if (sa < sb) return sortMissingDir === 'asc' ? -1 : 1
                          if (sa > sb) return sortMissingDir === 'asc' ? 1 : -1
                          return 0
                        })
                      }
                      return sorted.map((it, idx) => (
                        <tr key={idx} className="even:bg-muted/10">
                          <td className="p-2 align-top w-[5ch]">{idx + 1}</td>
                          <td className="p-2 align-top w-[15ch]">{it.icon ? <img src={it.icon} alt="icon" className="h-20 w-20 object-contain" /> : null}</td>
                          <td className="p-2 align-top break-words">{it.name}</td>
                          <td className="p-2 align-top">{it.titleId}</td>
                          <td className="p-2 align-top w-[10ch]">{it.region}</td>
                          <td className="p-2 align-top">{it.local_update}</td>
                          <td className="p-2 align-top">{it.latest_update}</td>
                          <td className="p-2 align-top">{it.latest_update_date}</td>
                          <td className="p-2 align-top break-words">{(it.missing_dlc || []).join(', ')}</td>
                        </tr>
                      ))
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="mdlc">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleLoadMissingDLC}>Refresh</Button>
              {missingDLCLoading && <span className="text-sm">Loading...</span>}
              {!missingDLCLoading && <span className="text-sm">{missingDLC.length} item{missingDLC.length === 1 ? "" : "s"}</span>}
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 w-[5ch]">#</th>
                    <th className="text-left p-2 w-[15ch]">Icon</th>
                    <th className="text-left p-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>Title</span>
                        </div>
                        <input value={filterDLC} onChange={(e) => setFilterDLC(e.target.value)} placeholder="filter column..." className="mt-1 w-full rounded border p-1 text-sm" />
                      </div>
                    </th>
                    <th className="text-left p-2">Title id</th>
                    <th className="text-left p-2 w-[10ch]">Region</th>
                    <th className="text-left p-2">Missing DLC</th>
                  </tr>
                </thead>
                <tbody>
                  {missingDLCLoading ? (
                    <tr>
                      <td colSpan={6} className="p-2">Loading missing DLC...</td>
                    </tr>
                  ) : missingDLC.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-2">No missing DLC</td>
                    </tr>
                  ) : (
                    missingDLC.filter(d => d.name.toLowerCase().includes(filterDLC.toLowerCase())).map((it, idx) => (
                      <tr key={idx} className="even:bg-muted/10">
                        <td className="p-2 align-top w-[5ch]">{idx + 1}</td>
                        <td className="p-2 align-top w-[15ch]">{it.icon ? <img src={it.icon} alt="icon" className="h-20 w-20 object-contain" /> : null}</td>
                        <td className="p-2 align-top break-words">{it.name}</td>
                        <td className="p-2 align-top">{it.titleId}</td>
                        <td className="p-2 align-top w-[10ch]">{it.region}</td>
                        <td className="p-2 align-top break-words">{(it.missing_dlc || []).join(', ')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="organize">
          <Button onClick={() => setMainCount2(mainCount2 + 1)}>Count up 2 ({mainCount2})</Button>
        </TabsContent>
        <TabsContent value="issues">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleLoadIssues}>Refresh</Button>
              {issuesLoading && <span className="text-sm">Loading...</span>}
              {!issuesLoading && <span className="text-sm">{issues.length} issue{issues.length === 1 ? "" : "s"}</span>}
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2">Path</th>
                    <th className="text-left p-2">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {issuesLoading ? (
                    <tr>
                      <td colSpan={2} className="p-2">Loading issues...</td>
                    </tr>
                  ) : issues.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-2">No issues</td>
                    </tr>
                  ) : (
                    issues.map((it, idx) => (
                      <tr key={idx} className="even:bg-muted/10">
                        <td className="p-2 align-top break-words">{it.key}</td>
                        <td className="p-2 align-top">{it.value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          {settings && (
            <div className="mt-4 flex flex-col gap-2">
              {!editMode ? (
                <>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => { setEditMode(true); setModifiedSettings(settings); setSaveStatus("") }}>Edit</Button>
                    <Button onClick={handleLoadSettings}>Reload</Button>
                    {saveStatus && <span className="text-sm">{saveStatus}</span>}
                  </div>
                  <pre ref={settingsPreRef} className="mt-2 overflow-auto rounded-md border bg-muted p-4 text-sm">
                    <code>{settings}</code>
                  </pre>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveSettings} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                    <Button onClick={() => { setEditMode(false); setModifiedSettings(settings); setSaveStatus("") }}>Cancel</Button>
                    <Button variant="secondary" onClick={handleLoadSettings} disabled={saving}>Reload</Button>
                    {saveStatus && <span className="text-sm">{saveStatus}</span>}
                  </div>
                  <textarea
                    className="mt-2 w-full rounded-md border bg-muted p-4 text-sm font-mono min-h-[20vh] max-h-[60vh] resize-y overflow-auto"
                    style={textareaHeight ? { height: textareaHeight } : undefined}
                    value={modifiedSettings}
                    onChange={(e) => setModifiedSettings(e.target.value)}
                  />
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CombinedTabs() {
  return (
    <div className="flex w-full flex-col gap-0">
      <Pbar />
      <Topmenu />
      <Tabsmenu />
    </div>
  )
}
