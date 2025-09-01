import { Button } from "@/components/ui/button"
//import { Tabs } from "@/components/ui/tabs"
//import { Progress } from "@/components/ui/progress"
//import { Table } from "@/components/ui/table"
import React from "react"


import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function Topmenu() {

  return (
    <div className="w-full">
      <Tabs defaultValue="files">
        <TabsList className="w-full justify-start gap-2 bg-black text-white">
          <TabsTrigger className="text-white" value="files">FILE</TabsTrigger>
          <TabsTrigger className="text-white" value="debug">DEBUG</TabsTrigger>
          <TabsTrigger className="text-white" value="theme">THEME</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-0" value="files"></TabsContent>
        <TabsContent className="mt-0" value="debug"></TabsContent>
        <TabsContent className="mt-0" value="theme"></TabsContent>
      </Tabs>
    </div>
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
