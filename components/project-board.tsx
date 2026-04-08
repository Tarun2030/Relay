'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { Project, ProjectStatus, ProjectUpdate } from '@/types'
import { projectStatusColors, projectStatusLabels, formatRelative, cn } from '@/lib/utils'

interface ProjectBoardProps {
  directorId: string
  initialProjects: Project[]
  eaName: string
  onProjectsChange?: (projects: Project[]) => void
}

interface ProjectItemProps {
  project: Project
  onStatusChange: (id: string, status: ProjectStatus) => Promise<void>
  onAddUpdate: (projectId: string, note: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function ProjectItem({ project, onStatusChange, onAddUpdate, onDelete }: ProjectItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [updateNote, setUpdateNote] = useState('')
  const [savingUpdate, setSavingUpdate] = useState(false)

  async function handleAddUpdate() {
    if (!updateNote.trim()) return
    setSavingUpdate(true)
    await onAddUpdate(project.id, updateNote.trim())
    setUpdateNote('')
    setSavingUpdate(false)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{project.name}</span>
            <Badge className={cn('text-xs', projectStatusColors[project.status])}>
              {projectStatusLabels[project.status]}
            </Badge>
            {project.updates && project.updates.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Updated {formatRelative(project.updates[0].created_at)}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.description}</p>
          )}
        </div>
        <div className="shrink-0">
          <Select value={project.status} onValueChange={(v) => onStatusChange(project.id, v as ProjectStatus)}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="needs_attention">Needs Attention</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30 p-4 space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={updateNote}
              onChange={(e) => setUpdateNote(e.target.value)}
              placeholder="Add an update..."
              className="min-h-[60px] text-sm"
            />
            <Button
              size="sm"
              onClick={handleAddUpdate}
              disabled={savingUpdate || !updateNote.trim()}
              className="shrink-0 self-end"
            >
              Post
            </Button>
          </div>
          {project.updates && project.updates.length > 0 ? (
            <div className="space-y-2">
              {project.updates.map((update) => (
                <div key={update.id} className="bg-background rounded-md p-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{update.posted_by}</span>
                    <span>·</span>
                    <span>{formatRelative(update.created_at)}</span>
                  </div>
                  <p>{update.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No updates yet</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ProjectBoard({ directorId, initialProjects, eaName }: ProjectBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [newProjectName, setNewProjectName] = useState('')
  const [addingProject, setAddingProject] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAddProject() {
    if (!newProjectName.trim()) return
    setAddingProject(true)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        director_id: directorId,
        name: newProjectName.trim(),
        status: 'on_track',
      }),
    })

    if (res.ok) {
      const project = await res.json()
      setProjects((prev) => [{ ...project, updates: [] }, ...prev])
      setNewProjectName('')
      setShowAddForm(false)
    }
    setAddingProject(false)
  }

  async function handleStatusChange(id: string, status: ProjectStatus) {
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    )
  }

  async function handleAddUpdate(projectId: string, note: string) {
    const res = await fetch(`/api/projects/${projectId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, posted_by: eaName }),
    })
    if (res.ok) {
      const update: ProjectUpdate = await res.json()
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, updates: [update, ...(p.updates || [])] }
            : p
        )
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const active = projects.filter((p) => p.status !== 'completed')
  const completed = projects.filter((p) => p.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{active.length} active project{active.length !== 1 ? 's' : ''}</span>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </div>

      {showAddForm && (
        <div className="flex gap-2">
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
          />
          <Button onClick={handleAddProject} disabled={addingProject}>
            Add
          </Button>
          <Button variant="outline" onClick={() => setShowAddForm(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {active.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            onStatusChange={handleStatusChange}
            onAddUpdate={handleAddUpdate}
            onDelete={handleDelete}
          />
        ))}
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No active projects</p>
        )}
      </div>

      {completed.length > 0 && (
        <details className="border rounded-lg">
          <summary className="p-3 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
            {completed.length} completed project{completed.length !== 1 ? 's' : ''}
          </summary>
          <div className="p-3 pt-0 space-y-2">
            {completed.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                onStatusChange={handleStatusChange}
                onAddUpdate={handleAddUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
