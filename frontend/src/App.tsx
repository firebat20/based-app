import { Button } from "@/components/ui/button"
//import { Progress } from "@/components/ui/progress"
//import { Table } from "@/components/ui/table"
import React from "react"

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
          <MenubarItem>Light</MenubarItem>
          <MenubarItem>Dark</MenubarItem>
          <MenubarItem>System</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

export function Tabsmenu() {
  const [mainCount1, setMainCount1] = React.useState(0)
  const [mainCount2, setMainCount2] = React.useState(0)

  return (
    <div className="flex w-full flex-col gap-6">
      <Tabs defaultValue="library">
        <TabsList className="flex w-full">
          <TabsTrigger className="flex-1" value="library">LIBRARY</TabsTrigger>
          <TabsTrigger className="flex-1" value="mupdate">MISSING UPDATE</TabsTrigger>
          <TabsTrigger className="flex-1" value="mdlc">MISSING DLC</TabsTrigger>
          <TabsTrigger className="flex-1" value="organize">ORGANIZE</TabsTrigger>
          <TabsTrigger className="flex-1" value="issues">ISSUES</TabsTrigger>
          <TabsTrigger className="flex-1" value="settings">SETTINGS</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <Button onClick={() => setMainCount1(mainCount1 + 1)}>Count up 1 ({mainCount1})</Button>
        </TabsContent>
        <TabsContent value="mupdate">
          <Button onClick={() => setMainCount2(mainCount2 + 1)}>Count up 2 ({mainCount2})</Button>
        </TabsContent>
        <TabsContent value="mdlc">
          <Button onClick={() => setMainCount1(mainCount1 + 1)}>Count up 1 ({mainCount1})</Button>
        </TabsContent>
        <TabsContent value="organize">
          <Button onClick={() => setMainCount2(mainCount2 + 1)}>Count up 2 ({mainCount2})</Button>
        </TabsContent>
        <TabsContent value="issues">
          <Button onClick={() => setMainCount1(mainCount1 + 1)}>Count up 1 ({mainCount1})</Button>
        </TabsContent>
        <TabsContent value="settings">
          <Button onClick={() => setMainCount2(mainCount2 + 1)}>Count up 2 ({mainCount2})</Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CombinedTabs() {
  return (
  <div className="flex w-full flex-col gap-0">
      <Topmenu />
      <Tabsmenu />
    </div>
  )
}
