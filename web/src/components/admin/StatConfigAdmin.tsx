'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Save, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatConfig {
  id: string
  name: string
  unit: string
  ideal_min: number | null
  ideal_max: number | null
  description: string | null
  sort_order: number
}

const EMPTY_FORM = { name: '', unit: '%', ideal_min: '', ideal_max: '', description: '', sort_order: '0' }

export default function StatConfigAdmin() {
  const [configs, setConfigs] = useState<StatConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/stat-configs')
    const data = await res.json()
    setConfigs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(cfg: StatConfig) {
    setEditId(cfg.id)
    setForm({
      name: cfg.name,
      unit: cfg.unit,
      ideal_min: cfg.ideal_min !== null ? String(cfg.ideal_min) : '',
      ideal_max: cfg.ideal_max !== null ? String(cfg.ideal_max) : '',
      description: cfg.description ?? '',
      sort_order: String(cfg.sort_order),
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      unit: form.unit.trim() || '%',
      ideal_min: form.ideal_min !== '' ? parseFloat(form.ideal_min) : null,
      ideal_max: form.ideal_max !== '' ? parseFloat(form.ideal_max) : null,
      description: form.description.trim() || null,
      sort_order: parseInt(form.sort_order) || 0,
    }

    if (editId) {
      await fetch(`/api/admin/stat-configs/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/admin/stat-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function del(id: string) {
    setDeleting(id)
    await fetch(`/api/admin/stat-configs/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Configurações de Estatísticas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Defina os parâmetros globais para acompanhamento dos jogadores
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--cyan)] text-black text-sm font-bold"
        >
          <Plus size={15} /> Nova Stat
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{editId ? 'Editar Estatística' : 'Nova Estatística'}</h2>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: 3-Bet, C-Bet Flop, WTSD..." className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Unidade</label>
              <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="%" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Ordem (sort)</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Ideal Mínimo</label>
              <input type="number" value={form.ideal_min} onChange={e => setForm(f => ({ ...f, ideal_min: e.target.value }))}
                placeholder="—" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Ideal Máximo</label>
              <input type="number" value={form.ideal_max} onChange={e => setForm(f => ({ ...f, ideal_max: e.target.value }))}
                placeholder="—" className="input-field w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Descrição (opcional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Explicação sobre esta estatística..." className="input-field w-full" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-dim)] hover:text-white">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !form.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--cyan)] text-black text-sm font-bold disabled:opacity-50">
              <Save size={13} />{saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">
          <span className="w-4" />
          <span>Nome</span>
          <span className="w-16 text-center">Unidade</span>
          <span className="w-24 text-center">Ideal</span>
          <span className="w-8" />
          <span className="w-8" />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)] animate-pulse">Carregando...</div>
        ) : configs.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            Nenhuma estatística criada ainda. Clique em &quot;Nova Stat&quot; para começar.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {configs.map(cfg => (
              <div key={cfg.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <GripVertical size={14} className="text-[var(--text-muted)] w-4" />
                <div>
                  <p className="text-sm font-semibold text-white">{cfg.name}</p>
                  {cfg.description && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{cfg.description}</p>
                  )}
                </div>
                <span className="w-16 text-center text-xs text-[var(--text-dim)]">{cfg.unit}</span>
                <span className="w-24 text-center text-xs text-[var(--text-muted)]">
                  {cfg.ideal_min ?? '—'} – {cfg.ideal_max ?? '—'}
                </span>
                <button onClick={() => openEdit(cfg)}
                  className="w-8 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => del(cfg.id)} disabled={deleting === cfg.id}
                  className={cn('w-8 p-1.5 rounded-lg transition-colors',
                    deleting === cfg.id
                      ? 'text-[var(--text-muted)] cursor-not-allowed'
                      : 'text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10'
                  )}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
